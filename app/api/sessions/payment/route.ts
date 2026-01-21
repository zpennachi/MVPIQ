import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCalendarEvent, refreshAccessToken, getCalendarId } from '@/lib/google-calendar'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

// Lazy initialization to avoid build-time errors
let stripe: Stripe | null = null

function getStripe(): Stripe {
  if (!stripe) {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured')
    }
    stripe = new Stripe(stripeKey, {
      apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
    })
  }
  return stripe
}

// Helper function to create Google Calendar event with Meet link
async function createGoogleCalendarEvent(session: any): Promise<{ meetLink: string; eventId?: string } | null> {
  try {
    const supabase = await createClient()
    
    // Get mentor's Google Calendar credentials
    const { data: mentor } = await supabase
      .from('profiles')
      .select('id, email, full_name, google_calendar_connected, google_calendar_access_token, google_calendar_refresh_token, google_calendar_id, google_calendar_token_expires_at')
      .eq('id', session.mentor_id)
      .single()

    if (!mentor?.google_calendar_connected || !mentor.google_calendar_access_token) {
      logger.warn('Mentor does not have Google Calendar connected', { mentorId: session.mentor_id })
      return null
    }

    // Check if token is expired and refresh if needed
    let accessToken = mentor.google_calendar_access_token
    const tokenExpiresAt = mentor.google_calendar_token_expires_at 
      ? new Date(mentor.google_calendar_token_expires_at)
      : null

    if (tokenExpiresAt && tokenExpiresAt < new Date() && mentor.google_calendar_refresh_token) {
      try {
        if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI) {
          accessToken = await refreshAccessToken(
            {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
              redirectUri: env.GOOGLE_REDIRECT_URI,
            },
            mentor.google_calendar_refresh_token
          )

          // Update stored token
          await supabase
            .from('profiles')
            .update({
              google_calendar_access_token: accessToken,
              google_calendar_token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour
            })
            .eq('id', mentor.id)

          logger.info('Refreshed Google Calendar access token', { mentorId: mentor.id })
        }
      } catch (refreshError: any) {
        logger.error('Failed to refresh Google Calendar token', refreshError, { mentorId: mentor.id })
        return null
      }
    }

    // Get user details
    const { data: user } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', session.user_id)
      .single()

    // Create calendar event
    const { eventId, meetLink } = await createCalendarEvent(
      accessToken,
      getCalendarId(mentor.google_calendar_id),
      {
        summary: `1-on-1 Session: ${user?.full_name || 'Student'} with ${mentor.full_name || 'Mentor'}`,
        description: `Scheduled mentoring session via MVP-IQ`,
        startTime: new Date(session.start_time),
        endTime: new Date(session.end_time),
        mentorEmail: mentor.email || '',
        userEmail: user?.email || '',
        mentorName: mentor.full_name || 'Mentor',
        userName: user?.full_name || 'Student',
      }
    )

    logger.info('Google Calendar event created', { sessionId: session.id, eventId, meetLink })

    return { meetLink, eventId }
  } catch (error: any) {
    logger.error('Failed to create Google Calendar event', error, { sessionId: session.id })
    return null
  }
}

// Helper function to send confirmation emails
async function sendConfirmationEmails(session: any, origin: string) {
  console.log('📧 Starting email notifications for session:', session.id)
  try {
    const supabase = await createClient()
    // Fetch user and mentor profiles directly - use maybeSingle to avoid errors
    const [userResult, mentorResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', session.user_id)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', session.mentor_id)
        .maybeSingle(),
    ])

    const userEmail = userResult.data?.email
    const userName = userResult.data?.full_name || userResult.data?.email
    const mentorEmail = mentorResult.data?.email
    const mentorName = mentorResult.data?.full_name || mentorResult.data?.email

    // Send both emails in parallel and wait for both
    const emailPromises = []

    // User confirmation email
    if (userEmail) {
      emailPromises.push(
        fetch(`${origin}/api/notifications/email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'session_confirmation',
            email: userEmail,
            data: {
              sessionId: session.id,
              mentorName: mentorName,
              startTime: session.start_time,
              meetingLink: session.meeting_link,
            },
          }),
        })
          .then(async (response) => {
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
              console.error('❌ Failed to send user confirmation email:', errorData, 'Status:', response.status)
              throw new Error(`User email failed: ${response.status}`)
            } else {
              console.log('✅ User confirmation email sent successfully to:', userEmail)
            }
          })
          .catch((error) => {
            console.error('❌ Exception sending user confirmation email:', error)
            throw error
          })
      )
    } else {
      console.error('❌ No user email found for session:', session.id, 'userResult:', userResult)
    }

    // Mentor notification email - THIS IS THE ONE THAT WAS MISSING!
    if (mentorEmail) {
      emailPromises.push(
        fetch(`${origin}/api/notifications/email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'session_booking_notification',
            email: mentorEmail,
            data: {
              sessionId: session.id,
              userName: userName,
              startTime: session.start_time,
              meetingLink: session.meeting_link,
            },
          }),
        })
          .then(async (response) => {
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
              console.error('❌ Failed to send mentor notification email:', errorData, 'Status:', response.status)
              throw new Error(`Mentor email failed: ${response.status}`)
            } else {
              console.log('✅ Mentor notification email sent successfully to:', mentorEmail)
            }
          })
          .catch((error) => {
            console.error('❌ Exception sending mentor notification email:', error)
            throw error
          })
      )
    } else {
      console.error('❌ No mentor email found for session:', session.id)
      console.error('Mentor result:', mentorResult)
      if (mentorResult.error) {
        console.error('Mentor profile query error:', mentorResult.error)
      }
    }

    // Wait for all emails to be sent
    if (emailPromises.length > 0) {
      await Promise.allSettled(emailPromises)
      console.log('📧 All email notifications processed for session:', session.id)
    } else {
      console.error('⚠️ No emails to send - missing user or mentor email')
    }
  } catch (emailError) {
    console.error('❌ Failed to send confirmation emails:', emailError)
    // Don't throw - we don't want email failures to break the booking
  }
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, amount, useCredit } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }

    // If using credit, amount can be 0
    if (!useCredit && !amount) {
      return NextResponse.json(
        { error: 'amount is required when not using credit' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('booked_sessions')
      .select('*, mentor:profiles!booked_sessions_mentor_id_fkey(*), user:profiles!booked_sessions_user_id_fkey(*)')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Verify user owns this session
    if (session.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Create Google Calendar event with Meet link (if mentor has connected calendar)
    let meetingLink: string | null = null
    let googleEventId: string | undefined = undefined
    
    try {
      const calendarEvent = await createGoogleCalendarEvent(session)
      meetingLink = calendarEvent?.meetLink || null
      googleEventId = calendarEvent?.eventId
      
      if (meetingLink) {
        logger.info('Google Meet link generated', { sessionId, meetingLink, googleEventId })
      } else {
        logger.warn('No meeting link generated - mentor may not have Google Calendar connected', { sessionId, mentorId: session.mentor_id })
      }
    } catch (calendarError: any) {
      logger.error('Failed to create Google Calendar event', calendarError, { sessionId })
      // Continue without calendar event - don't fail the booking
    }

    // If using credit, skip payment processing
    if (useCredit) {
      // Update session with meeting link and calendar event ID
      await supabase
        .from('booked_sessions')
        .update({
          meeting_link: meetingLink,
          ...(googleEventId && { google_event_id: googleEventId }),
        })
        .eq('id', sessionId)
      
      // Reload session to get updated meeting_link before sending emails
      const { data: updatedSession } = await supabase
        .from('booked_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()
      
      // Send confirmation emails with updated session data (includes meeting_link)
      await sendConfirmationEmails(updatedSession || session, request.nextUrl.origin)
      
      return NextResponse.json({
        success: true,
        creditUsed: true,
        message: 'Session confirmed using credit',
        meetingLink,
      })
    }

    // Check if dev mode (no Stripe key)
    if (!process.env.STRIPE_SECRET_KEY || process.env.NODE_ENV === 'development') {
      // Dev mode: Skip payment
      await supabase
        .from('booked_sessions')
        .update({
          payment_status: 'completed',
          status: 'confirmed',
          payment_intent_id: `dev_${Date.now()}`,
          meeting_link: meetingLink,
          ...(googleEventId && { google_event_id: googleEventId }),
        })
        .eq('id', sessionId)

      // Reload session to get updated meeting_link before sending emails
      const { data: updatedSession } = await supabase
        .from('booked_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()
      
      // Send confirmation emails with updated session data (includes meeting_link)
      await sendConfirmationEmails(updatedSession || session, request.nextUrl.origin)

      return NextResponse.json({
        success: true,
        devMode: true,
        message: 'Session confirmed (dev mode - payment skipped)',
        meetingLink,
      })
    }

    // PRODUCTION: Create Stripe checkout session
    const stripe = getStripe()
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `1-on-1 Session with ${(session as any).mentor?.full_name || 'Mentor'}`,
              description: `Scheduled for ${new Date(session.start_time).toLocaleString()}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${request.nextUrl.origin}/dashboard?session=success`,
      cancel_url: `${request.nextUrl.origin}/dashboard/calendar?session=cancelled`,
      client_reference_id: sessionId,
      metadata: {
        sessionId: session.id,
        mentorId: session.mentor_id,
        userId: session.user_id,
      },
    })

    // Update session with payment intent, meeting link, and calendar event ID
    await supabase
      .from('booked_sessions')
      .update({
        payment_intent_id: checkoutSession.id,
        payment_status: 'processing',
        meeting_link: meetingLink,
        ...(googleEventId && { google_event_id: googleEventId }),
      })
      .eq('id', sessionId)

    return NextResponse.json({
      checkoutUrl: checkoutSession.url,
      paymentIntentId: checkoutSession.id,
    })
  } catch (error: any) {
    console.error('Error creating session payment:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
