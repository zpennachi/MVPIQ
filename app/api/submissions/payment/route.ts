import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
    })
  : null

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { submissionId } = body

    if (!submissionId) {
      return NextResponse.json(
        { error: 'Submission ID is required' },
        { status: 400 }
      )
    }

    // Verify submission belongs to user
    const { data: submission, error: submissionError } = await supabase
      .from('feedback_submissions')
      .select('*, videos(*)')
      .eq('id', submissionId)
      .eq('player_id', user.id)
      .single()

    if (submissionError || !submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      )
    }

    const video = submission.videos as any

    // DEV MODE: If Stripe is not configured, skip payment and mark as completed
    if (!stripe || !stripeSecretKey) {
      console.log('⚠️ DEV MODE: Stripe not configured, skipping payment...')
      
      // Mark payment as completed in dev mode
      await supabase
        .from('feedback_submissions')
        .update({
          payment_intent_id: 'dev-mode-skip',
          payment_status: 'completed',
        })
        .eq('id', submissionId)

      // Create payment record marked as succeeded
      await supabase.from('payments').insert({
        submission_id: submissionId,
        player_id: user.id,
        amount: 5000,
        currency: 'usd',
        stripe_payment_intent_id: 'dev-mode-skip',
        status: 'succeeded',
      })

      // Send payment confirmation email
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
        const emailResponse = await fetch(`${baseUrl}/api/notifications/email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'payment_confirmation',
            email: user.email,
            data: {
              amount: 5000,
              submissionId: submission.id,
              videoTitle: video?.title,
            },
          }),
        })

        const emailResult = await emailResponse.json()
        if (emailResponse.ok) {
          console.log('✅ Payment confirmation email sent:', emailResult)
        } else {
          console.error('❌ Failed to send payment confirmation email:', emailResult)
        }
      } catch (emailError) {
        console.error('Failed to send payment confirmation email:', emailError)
      }

      // Send submission success email
      try {
        // Get mentor profile
        console.log('🔍 [Payment Route] Looking up mentor for submission:', submission.id, 'mentor_id:', submission.mentor_id)
        
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

        const { data: mentorProfile, error: mentorError } = await supabase
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('id', submission.mentor_id)
          .single()

        if (mentorError) {
          console.error('❌ [Payment Route] Error fetching mentor profile:', mentorError)
        }

        if (!submission.mentor_id) {
          console.warn('⚠️ [Payment Route] No mentor_id in submission, skipping mentor notification')
        } else if (!mentorProfile) {
          console.warn('⚠️ [Payment Route] Mentor profile not found for ID:', submission.mentor_id)
        } else {
          console.log('✅ [Payment Route] Found mentor:', mentorProfile.email, getFullName(mentorProfile))
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
        
        // Send submission success email to player
        const submissionResponse = await fetch(`${baseUrl}/api/notifications/email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'submission_success',
            email: user.email,
            data: {
              videoTitle: video?.title,
              mentorName: getFullName(mentorProfile) || 'Professional Athlete',
            },
          }),
        })

        const submissionResult = await submissionResponse.json()
        if (submissionResponse.ok) {
          console.log('✅ Submission success email sent to player:', submissionResult)
        } else {
          console.error('❌ Failed to send submission success email:', submissionResult)
        }

        // Notify mentor of new submission
        if (submission.mentor_id && mentorProfile?.email) {
          console.log('📧 Sending mentor notification to:', mentorProfile.email)
          
          const { data: playerProfile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', user.id)
            .single()

          console.log('📧 [Payment Route] Sending notification email to mentor:', mentorProfile.email)
          
          const mentorResponse = await fetch(`${baseUrl}/api/notifications/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'new_submission',
              email: mentorProfile.email,
              data: {
                videoTitle: video?.title,
                playerName: getFullName(playerProfile) || 'Player',
                mentorName: getFullName(mentorProfile),
                dashboardLink: `${baseUrl}/dashboard/feedback`,
              },
            }),
          })

          const mentorResult = await mentorResponse.json()
          if (mentorResponse.ok) {
            console.log('✅✅✅ [Payment Route] Mentor notification email sent successfully!', mentorResult)
          } else {
            console.error('❌❌❌ [Payment Route] FAILED to send mentor notification email:', mentorResult, 'Status:', mentorResponse.status)
          }
        } else {
          console.warn('⚠️ Skipping mentor notification - no mentor_id or mentor email')
        }
      } catch (emailError) {
        console.error('❌ Failed to send submission emails:', emailError)
      }

      return NextResponse.json({
        paymentIntentId: 'dev-mode-skip',
        checkoutUrl: null, // No checkout needed
        devMode: true,
      })
    }

    // PRODUCTION MODE: Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Football Feedback - ${video?.title || 'Video'}`,
              description: 'Professional feedback on your football playing',
            },
            unit_amount: 5000, // $50.00
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?canceled=true`,
      client_reference_id: submissionId,
      metadata: {
        submissionId: submission.id,
        videoId: submission.video_id,
        playerId: user.id,
      },
    })

    // Update submission with payment intent
    await supabase
      .from('feedback_submissions')
      .update({
        payment_intent_id: checkoutSession.id,
        payment_status: 'processing',
      })
      .eq('id', submissionId)

    // Create payment record
    await supabase.from('payments').insert({
      submission_id: submissionId,
      player_id: user.id,
      amount: 5000,
      currency: 'usd',
      stripe_payment_intent_id: checkoutSession.id,
      status: 'pending',
    })

    return NextResponse.json({
      paymentIntentId: checkoutSession.id,
      checkoutUrl: checkoutSession.url,
    })
  } catch (error: any) {
    console.error('Error creating payment:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!stripe || !stripeSecretKey) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 503 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const intentId = searchParams.get('intent')

    if (!intentId) {
      return NextResponse.json(
        { error: 'Payment intent ID is required' },
        { status: 400 }
      )
    }

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(intentId)

    if (session.status === 'complete') {
      return NextResponse.json({
        status: 'completed',
        checkoutUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=success`,
      })
    }

    // If session is still open, return the checkout URL
    return NextResponse.json({
      status: session.status,
      checkoutUrl: session.url,
    })
  } catch (error: any) {
    console.error('Error retrieving payment:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
