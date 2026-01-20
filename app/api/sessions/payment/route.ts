import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
})

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

    // If using credit, skip payment processing
    if (useCredit) {
      // Credit already applied in BookSession component
      // Just send confirmation emails
      await sendConfirmationEmails(session, request.nextUrl.origin)
      
      return NextResponse.json({
        success: true,
        creditUsed: true,
        message: 'Session confirmed using credit',
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
        })
        .eq('id', sessionId)

      // Send confirmation emails
      await sendConfirmationEmails(session, request.nextUrl.origin)

      return NextResponse.json({
        success: true,
        devMode: true,
        message: 'Session confirmed (dev mode - payment skipped)',
      })
    }

    // PRODUCTION: Create Stripe checkout session
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

    // Update session with payment intent
    await supabase
      .from('booked_sessions')
      .update({
        payment_intent_id: checkoutSession.id,
        payment_status: 'processing',
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
