import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCalendarEvent } from '@/lib/google-calendar'
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

// Helper function to create Google Calendar event with Meet link using OAuth
async function createGoogleCalendarEvent(session: any): Promise<{ meetLink: string; eventId?: string } | null> {
  try {
    logger.info('createGoogleCalendarEvent called', { 
      sessionId: session.id,
      mentorId: session.mentor_id,
      userId: session.user_id,
      startTime: session.start_time,
    })
    
    const supabase = await createClient()
    
    // Get mentor and user details
    const [mentorResult, userResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', session.mentor_id)
        .single(),
      supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', session.user_id)
        .single(),
    ])

    const mentor = mentorResult.data
    const user = userResult.data

    if (!mentor || !user) {
      logger.warn('Mentor or user not found', { 
        mentorId: session.mentor_id, 
        userId: session.user_id,
        mentorFound: !!mentor,
        userFound: !!user,
        mentorError: mentorResult.error?.message,
        userError: userResult.error?.message,
      })
      return null
    }

    logger.info('Calling createCalendarEvent', {
      sessionId: session.id,
      mentorEmail: mentor.email,
      userEmail: user.email,
      startTime: session.start_time,
      endTime: session.end_time,
    })

    // Helper to get full name from first_name and last_name
    function getFullName(profile: any): string {
      if (!profile) return ''
      const firstName = profile.first_name?.trim() || ''
      const lastName = profile.last_name?.trim() || ''
      if (firstName && lastName) return `${firstName} ${lastName}`
      if (firstName) return firstName
      if (lastName) return lastName
      return profile.email || ''
    }

    const userFullName = getFullName(user) || 'Student'
    const mentorFullName = getFullName(mentor) || 'Mentor'

    // Create calendar event using mentor's OAuth tokens
    const { eventId, meetLink } = await createCalendarEvent({
      summary: `1-on-1 Session: ${userFullName} with ${mentorFullName}`,
      description: `Scheduled mentoring session via MVP-IQ`,
      startTime: new Date(session.start_time),
      endTime: new Date(session.end_time),
      mentorEmail: mentor.email || '',
      userEmail: user.email || '',
      mentorName: mentorFullName,
      userName: userFullName,
      mentorId: session.mentor_id, // Use mentor's OAuth tokens
    })

    logger.info('✅ Google Calendar event created successfully', { 
      sessionId: session.id, 
      eventId, 
      meetLink,
      hasMeetLink: !!meetLink,
      meetLinkLength: meetLink?.length || 0,
    })

    return { meetLink, eventId }
  } catch (error: any) {
    logger.error('❌ Failed to create Google Calendar event', error, { 
      sessionId: session.id,
      errorMessage: error?.message,
      errorCode: error?.code,
      errorStack: error?.stack,
    })
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
        .select('email, first_name, last_name')
        .eq('id', session.user_id)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', session.mentor_id)
        .maybeSingle(),
    ])

    // Helper to get full name
    function getFullName(profile: any): string {
      if (!profile) return ''
      const firstName = profile.first_name?.trim() || ''
      const lastName = profile.last_name?.trim() || ''
      if (firstName && lastName) return `${firstName} ${lastName}`
      if (firstName) return firstName
      if (lastName) return lastName
      return profile.email || ''
    }

    const userEmail = userResult.data?.email
    const userName = getFullName(userResult.data) || userResult.data?.email
    const mentorEmail = mentorResult.data?.email
    const mentorName = getFullName(mentorResult.data) || mentorResult.data?.email

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

    // Check if dev mode FIRST (before trying to use Stripe)
    const isDevMode = !process.env.STRIPE_SECRET_KEY || process.env.NODE_ENV === 'development'
    
    logger.info('Payment route called', { sessionId, isDevMode, hasStripeKey: !!process.env.STRIPE_SECRET_KEY })

    // Create Google Calendar event with Meet link using OAuth
    // Only generate if not already created (preserve existing meeting link)
    let meetingLink: string | null = session.meeting_link || null
    let googleEventId: string | undefined = session.google_event_id || undefined
    
    // Only try to generate if we don't already have a meeting link
    if (!meetingLink) {
      try {
        logger.info('Attempting to generate meeting link in payment route', { sessionId, mentorId: session.mentor_id })
        const calendarEvent = await createGoogleCalendarEvent(session)
        meetingLink = calendarEvent?.meetLink || null
        googleEventId = calendarEvent?.eventId
        
        if (meetingLink) {
          logger.info('✅ Google Meet link generated successfully in payment route', { 
            sessionId, 
            meetingLink, 
            googleEventId,
            meetingLinkLength: meetingLink.length 
          })
        } else {
          logger.warn('⚠️ No meeting link generated in payment route', { 
            sessionId, 
            mentorId: session.mentor_id,
            hasEventId: !!googleEventId,
            eventId: googleEventId,
            hint: 'OAuth may not be connected or Meet link generation failed. Check Vercel logs for details.'
          })
        }
      } catch (calendarError: any) {
        // Log detailed error for debugging
        const errorMessage = calendarError?.message || 'Unknown error'
        logger.error('❌ Failed to create Google Calendar event in payment route', calendarError, { 
          sessionId,
          errorMessage,
          errorCode: calendarError?.code,
          errorStack: calendarError?.stack,
          hint: errorMessage.includes('not configured') 
            ? 'Google OAuth not configured. See GOOGLE_CALENDAR_SETUP.md'
            : errorMessage.includes('OAuth')
            ? 'OAuth tokens may be invalid or expired. Try reconnecting calendar in settings.'
            : 'Check OAuth tokens and calendar permissions'
        })
        // Continue without calendar event - don't fail the booking
        // Keep existing meeting link if it exists
      }
    } else {
      logger.info('Using existing meeting link', { sessionId, meetingLink })
    }

    // If using credit, skip payment processing
    if (useCredit) {
      logger.info('Updating session with meeting link (credit flow)', {
        sessionId,
        meetingLink,
        hasMeetingLink: !!meetingLink,
        meetingLinkLength: meetingLink?.length || 0,
        googleEventId,
      })
      
      // Update session with meeting link and calendar event ID
      const { error: updateError, data: updateData } = await supabase
        .from('booked_sessions')
        .update({
          meeting_link: meetingLink,
          ...(googleEventId && { google_event_id: googleEventId }),
        })
        .eq('id', sessionId)
        .select('meeting_link, google_event_id')
        .single()
      
      if (updateError) {
        logger.error('Failed to update session with meeting link (credit flow)', updateError, { sessionId })
      } else {
        logger.info('Session updated successfully (credit flow)', {
          sessionId,
          storedMeetingLink: updateData?.meeting_link,
          hasStoredMeetingLink: !!updateData?.meeting_link,
        })
      }
      
      // Reload session to get updated meeting_link before sending emails
      const { data: updatedSession } = await supabase
        .from('booked_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()
      
      logger.info('Reloaded session after update (credit flow)', {
        sessionId,
        meetingLink: updatedSession?.meeting_link,
        hasMeetingLink: !!updatedSession?.meeting_link,
      })
      
      // Send confirmation emails with updated session data (includes meeting_link)
      await sendConfirmationEmails(updatedSession || session, request.nextUrl.origin)
      
      return NextResponse.json({
        success: true,
        creditUsed: true,
        message: 'Session confirmed using credit',
        meetingLink: updatedSession?.meeting_link || meetingLink,
      })
    }

    if (isDevMode) {
      // Dev mode: Skip payment
      logger.info('Updating session to confirmed in dev mode', { sessionId, meetingLink, googleEventId })
      
      const updateData: any = {
        payment_status: 'completed',
        status: 'confirmed',
        payment_intent_id: `dev_${Date.now()}`,
      }
      
      if (meetingLink) {
        updateData.meeting_link = meetingLink
      }
      
      // Try update with google_event_id first
      if (googleEventId) {
        updateData.google_event_id = googleEventId
      }
      
      logger.info('Updating session in dev mode', {
        sessionId,
        updateDataKeys: Object.keys(updateData),
        meetingLinkInUpdate: updateData.meeting_link,
        hasMeetingLinkInUpdate: !!updateData.meeting_link,
      })
      
      let { data: updatedSession, error: updateError } = await supabase
        .from('booked_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select()
        .single()

      // If update fails due to missing google_event_id column, retry without it
      if (updateError && updateError.message?.includes('google')) {
        logger.warn('google_event_id column may not exist, retrying without it', { sessionId, error: updateError.message })
        const { google_event_id, ...updateDataWithoutGoogle } = updateData
        const retryResult = await supabase
          .from('booked_sessions')
          .update(updateDataWithoutGoogle)
          .eq('id', sessionId)
          .select()
          .single()
        
        updatedSession = retryResult.data
        updateError = retryResult.error
      }

      if (updateError) {
        logger.error('Failed to update session status in dev mode', updateError, { sessionId })
        return NextResponse.json(
          { error: `Failed to update session: ${updateError.message}` },
          { status: 500 }
        )
      }

      logger.info('✅ Session updated successfully in dev mode', { 
        sessionId, 
        status: updatedSession?.status,
        payment_status: updatedSession?.payment_status,
        meeting_link: updatedSession?.meeting_link,
        hasMeetingLink: !!updatedSession?.meeting_link,
        meetingLinkLength: updatedSession?.meeting_link?.length || 0,
        googleEventId: updatedSession?.google_event_id,
        meetingLinkFromUpdate: meetingLink,
        meetingLinkMatches: updatedSession?.meeting_link === meetingLink,
      })
      
      // Send confirmation emails with updated session data (includes meeting_link)
      await sendConfirmationEmails(updatedSession || session, request.nextUrl.origin)

      return NextResponse.json({
        success: true,
        devMode: true,
        message: 'Session confirmed (dev mode - payment skipped)',
        meetingLink: updatedSession?.meeting_link || meetingLink,
        sessionStatus: updatedSession?.status,
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
              name: `1-on-1 Session with ${((session as any).mentor?.first_name && (session as any).mentor?.last_name ? `${(session as any).mentor.first_name} ${(session as any).mentor.last_name}` : (session as any).mentor?.first_name || (session as any).mentor?.last_name || 'Mentor')}`,
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
