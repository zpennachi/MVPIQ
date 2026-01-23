import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'
import { logger } from '@/lib/logger'
import { env, isStripeConfigured } from '@/lib/env'
import { videoPaymentSchema } from '@/lib/validations'
import { handleApiError, UnauthorizedError, NotFoundError, ValidationError } from '@/lib/errors'
import { sendEmails } from '@/lib/email'

export const dynamic = 'force-dynamic'

const stripe = isStripeConfigured()
  ? new Stripe(env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
    })
  : null

export async function POST(request: NextRequest) {
  try {
    logger.info('Video payment request received')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new UnauthorizedError()
    }

    const body = await request.json()
    const { videoId, mentorId } = videoPaymentSchema.parse(body)
    logger.debug('Payment request validated', { videoId, mentorId })

    // Verify mentor exists and video belongs to user in parallel
    const [mentorResult, videoResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .eq('id', mentorId)
        .eq('role', 'mentor')
        .single(),
      supabase
        .from('videos')
        .select('*')
        .eq('id', videoId)
        .eq('player_id', user.id)
        .single(),
    ])

    if (mentorResult.error || !mentorResult.data) {
      throw new ValidationError('Invalid mentor selected', mentorResult.error)
    }

    if (videoResult.error || !videoResult.data) {
      throw new NotFoundError('Video', videoId)
    }

    const mentor = mentorResult.data
    const video = videoResult.data

    // DEV MODE: If Stripe is not configured, skip payment and mark as ready
    if (!stripe || !isStripeConfigured()) {
      logger.info('Dev mode: Stripe not configured, skipping payment')
      
      // Update video status and create submission in parallel
      const [updateResult, submissionResult, playerResult] = await Promise.all([
        supabase
          .from('videos')
          .update({ status: 'ready' })
          .eq('id', videoId),
        supabase
          .from('feedback_submissions')
          .insert({
            video_id: videoId,
            player_id: user.id,
            mentor_id: mentorId,
            status: 'assigned',
            payment_status: 'completed',
          })
          .select()
          .single(),
        supabase
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('id', user.id)
          .single(),
      ])

      if (submissionResult.error) {
        logger.error('Error creating feedback submission in dev mode', submissionResult.error)
        throw new ValidationError('Failed to create submission', submissionResult.error)
      }

      logger.info('Dev mode: Feedback submission created', {
        submissionId: submissionResult.data?.id,
        mentorId,
        mentorEmail: mentor.email,
      })

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

      const playerName = getFullName(playerResult.data) || playerResult.data?.email || 'Player'
      const playerEmail = playerResult.data?.email

      // Send emails using centralized utility
      const emailResults = await sendEmails([
        ...(playerEmail
          ? [
              {
                type: 'submission_success' as const,
                recipient: playerEmail,
                data: {
                  videoTitle: video.title || 'Video Submission',
                  dashboardLink: `${env.NEXT_PUBLIC_APP_URL}/dashboard/feedback`,
                },
              },
            ]
          : []),
        ...(mentor.email
          ? [
              {
                type: 'new_submission' as const,
                recipient: mentor.email,
                data: {
                  mentorName: getFullName(mentor) || mentor.email,
                  videoTitle: video.title || 'Video Submission',
                  playerName,
                  dashboardLink: `${env.NEXT_PUBLIC_APP_URL}/dashboard/feedback`,
                },
              },
            ]
          : []),
      ])

      logger.info('Dev mode: Email notifications sent', {
        sent: emailResults.filter(r => r.success).length,
        failed: emailResults.filter(r => !r.success).length,
      })

      return NextResponse.json({
        success: true,
        devMode: true,
        message: 'Payment skipped in dev mode. Video is ready.',
      })
    }

    // PRODUCTION MODE: Create Stripe checkout session
    if (!stripe) {
      throw new ValidationError('Stripe is not configured')
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Video Upload - ${video.title || 'Video'}`,
              description: 'Upload and get professional feedback on your football video',
            },
            unit_amount: 5000, // $50.00
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${env.NEXT_PUBLIC_APP_URL}/dashboard?video_payment=success`,
      cancel_url: `${env.NEXT_PUBLIC_APP_URL}/dashboard?video_payment=canceled`,
      client_reference_id: videoId,
      metadata: {
        videoId: video.id,
        playerId: user.id,
        mentorId: mentorId,
        type: 'video_upload',
      },
    })

    logger.info('Stripe checkout session created', {
      sessionId: checkoutSession.id,
      videoId,
      mentorId,
    })

    // Note: For video uploads, we don't create a payment record in the payments table
    // since it requires a submission_id. Payment is tracked via video status and Stripe metadata.
    // The webhook will update the video status to 'ready' when payment succeeds.

    return NextResponse.json({
      paymentIntentId: checkoutSession.id,
      checkoutUrl: checkoutSession.url,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
