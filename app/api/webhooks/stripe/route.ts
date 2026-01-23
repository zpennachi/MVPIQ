import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCalendarEvent } from '@/lib/google-calendar'
import Stripe from 'stripe'
import { env, isStripeConfigured } from '@/lib/env'
import { logger } from '@/lib/logger'
import { handleApiError, ValidationError, NotFoundError } from '@/lib/errors'
import { sendEmails } from '@/lib/email'

// Helper to get full name from profile
function getFullName(profile: { first_name?: string | null; last_name?: string | null; email?: string | null } | null | undefined): string {
  if (!profile) return ''
  const firstName = profile.first_name?.trim() || ''
  const lastName = profile.last_name?.trim() || ''
  if (firstName && lastName) {
    return `${firstName} ${lastName}`
  } else if (firstName) {
    return firstName
  } else if (lastName) {
    return lastName
  }
  return profile.email || ''
}

export const dynamic = 'force-dynamic'

// Lazy initialization to avoid build-time errors
let stripe: Stripe | null = null
let webhookSecret: string | null = null

function getStripe(): Stripe {
  if (!stripe) {
    if (!isStripeConfigured()) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET')
    }
    stripe = new Stripe(env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
    })
  }
  return stripe
}

function getWebhookSecret(): string {
  if (!webhookSecret) {
    if (!isStripeConfigured()) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET')
    }
    webhookSecret = env.STRIPE_WEBHOOK_SECRET!
  }
  return webhookSecret
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  const webhookSecret = getWebhookSecret()
  const stripe = getStripe()

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing signature or webhook secret' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    logger.error('Webhook signature verification failed', err)
    return NextResponse.json(
      { error: err instanceof Error ? `Webhook Error: ${err.message}` : 'Webhook Error: Invalid signature' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // Check if this is a video upload payment
        if (session.metadata?.type === 'video_upload') {
          const videoId = session.metadata?.videoId || session.client_reference_id
          const mentorId = session.metadata?.mentorId

          if (!mentorId) {
            logger.error('No mentorId in payment metadata', undefined, { videoId, sessionId: session.id })
            break
          }

          if (videoId) {
            // Get video and mentor details in parallel
            const [videoResult, mentorResult] = await Promise.all([
              supabase
                .from('videos')
                .select('*, player_id')
                .eq('id', videoId)
                .single(),
              supabase
                .from('profiles')
                .select('id, email, first_name, last_name')
                .eq('id', mentorId)
                .eq('role', 'mentor')
                .single(),
            ])

            if (videoResult.error || !videoResult.data) {
              logger.error('Video not found in webhook', videoResult.error, { videoId })
              break
            }

            if (mentorResult.error || !mentorResult.data) {
              logger.error('Invalid mentor selected in webhook', mentorResult.error, { mentorId, videoId })
              break
            }

            const video = videoResult.data
            const mentor = mentorResult.data

            // Update video status to ready
            await supabase
              .from('videos')
              .update({
                status: 'ready',
              })
              .eq('id', videoId)

            // Create feedback submission with selected mentor
            const { data: submission, error: submissionError } = await supabase
              .from('feedback_submissions')
              .insert({
                video_id: videoId,
                player_id: video.player_id,
                mentor_id: mentorId,
                status: 'assigned', // Mark as assigned since mentor is selected
                payment_status: 'completed',
                payment_intent_id: session.id,
              })
              .select()
              .single()

            if (submissionError) {
              logger.error('Failed to create feedback submission in webhook', submissionError, { videoId, mentorId })
            } else {
              logger.info('Feedback submission created in webhook', {
                submissionId: submission.id,
                videoId,
                mentorId,
                mentorEmail: mentor.email,
              })

              // Get player info
              const { data: playerProfile } = await supabase
                .from('profiles')
                .select('first_name, last_name, email')
                .eq('id', video.player_id)
                .single()

              const playerName = getFullName(playerProfile) || playerProfile?.email || 'Player'
              const playerEmail = playerProfile?.email

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

              logger.info('Webhook emails processed', {
                sent: emailResults.filter(r => r.success).length,
                failed: emailResults.filter(r => !r.success).length,
              })
            }

            // Update payment record
            await supabase
              .from('payments')
              .update({
                status: 'succeeded',
              })
              .eq('stripe_payment_intent_id', session.id)

            logger.info('Payment completed for video upload', { videoId })
            break
          }
        }

        // Check if this is a session booking payment
        // Check both metadata.sessionId and client_reference_id
        const sessionId = session.metadata?.sessionId || session.client_reference_id

        if (sessionId) {
          // First, get the session to verify it exists and get user/mentor IDs
          const { data: existingSession } = await supabase
            .from('booked_sessions')
            .select('user_id, mentor_id, start_time, end_time')
            .eq('id', sessionId)
            .single()

          if (!existingSession) {
            logger.error('Session not found in webhook', undefined, { sessionId })
            break
          }

          // Create Google Calendar event with Meet link using OAuth
          let meetingLink: string | null = null
          let googleEventId: string | undefined = undefined

          try {
            // Get mentor and user details
            const [mentorResult, userResult] = await Promise.all([
              supabase
                .from('profiles')
                .select('email, first_name, last_name')
                .eq('id', existingSession.mentor_id)
                .single(),
              supabase
                .from('profiles')
                .select('email, first_name, last_name')
                .eq('id', existingSession.user_id)
                .single(),
            ])

            const mentor = mentorResult.data
            const user = userResult.data

            if (mentor && user) {
              // Create calendar event using mentor's OAuth tokens
              const calendarResult = await createCalendarEvent({
                summary: `1-on-1 Session: ${getFullName(user) || 'Student'} with ${getFullName(mentor) || 'Mentor'}`,
                description: `Scheduled mentoring session via MVP-IQ`,
                startTime: new Date(existingSession.start_time),
                endTime: new Date(existingSession.end_time || new Date(new Date(existingSession.start_time).getTime() + 60 * 60 * 1000)),
                mentorEmail: mentor.email || '',
                userEmail: user.email || '',
                mentorName: getFullName(mentor) || 'Mentor',
                userName: getFullName(user) || 'Student',
                mentorId: existingSession.mentor_id, // Use mentor's OAuth tokens
              })

              meetingLink = calendarResult.meetLink
              googleEventId = calendarResult.eventId

              logger.info('Google Calendar event created in webhook', { sessionId, eventId: googleEventId, meetingLink })
            }
          } catch (calendarError: any) {
            logger.error('Failed to create Google Calendar event in webhook', calendarError, { sessionId })
            // Continue without calendar event - don't fail the payment
          }
          
          // Update session status
          await supabase
            .from('booked_sessions')
            .update({
              payment_status: 'completed',
              status: 'confirmed',
              payment_intent_id: session.id,
              meeting_link: meetingLink,
              ...(googleEventId && { google_event_id: googleEventId }),
            })
            .eq('id', sessionId)

          // Fetch user and mentor profiles directly - use maybeSingle to avoid errors
          const [userResult, mentorResult] = await Promise.all([
            supabase
              .from('profiles')
              .select('email, first_name, last_name')
              .eq('id', existingSession.user_id)
              .maybeSingle(),
            supabase
              .from('profiles')
              .select('email, first_name, last_name')
              .eq('id', existingSession.mentor_id)
              .maybeSingle(),
          ])

          const userEmail = userResult.data?.email
          const userName = getFullName(userResult.data) || userResult.data?.email
          const mentorEmail = mentorResult.data?.email
          const mentorName = getFullName(mentorResult.data) || mentorResult.data?.email

          logger.info('Starting email notifications for session', {
            sessionId,
            userId: existingSession.user_id,
            mentorId: existingSession.mentor_id,
          })

          // Get the updated session to include meeting link
          const { data: updatedSession } = await supabase
            .from('booked_sessions')
            .select('meeting_link')
            .eq('id', sessionId)
            .single()

          // Send emails using centralized utility
          const emailResults = await sendEmails([
            ...(userEmail
              ? [
                  {
                    type: 'session_confirmation' as const,
                    recipient: userEmail,
                      data: {
                        sessionId,
                        mentorName,
                        startTime: existingSession.start_time,
                        meetingLink: meetingLink,
                      },
                  },
                ]
              : []),
            ...(mentorEmail
              ? [
                  {
                    type: 'session_booking_notification' as const,
                    recipient: mentorEmail,
                      data: {
                        sessionId,
                        userName,
                        startTime: existingSession.start_time,
                        meetingLink: meetingLink,
                      },
                  },
                ]
              : []),
          ])

          if (emailResults.length === 0) {
            logger.warn('No emails sent for session', { sessionId, userEmail, mentorEmail })
          } else {
            logger.info('Session emails processed', {
              sessionId,
              sent: emailResults.filter(r => r.success).length,
              failed: emailResults.filter(r => !r.success).length,
            })
          }

          logger.info('Payment completed for session', { sessionId })
          break
        }

        // Otherwise, handle as feedback submission payment
        const submissionId = session.metadata?.submissionId || session.client_reference_id

        if (!submissionId) {
          logger.warn('No submission ID in checkout session', { sessionId: session.id })
          break
        }

        // Update submission status
        await supabase
          .from('feedback_submissions')
          .update({
            payment_status: 'completed',
            status: 'assigned',
          })
          .eq('id', submissionId)

        // Update payment record
        await supabase
          .from('payments')
          .update({
            status: 'succeeded',
          })
          .eq('stripe_payment_intent_id', session.id)

        logger.info('Payment completed for submission', { submissionId })
        break
      }

      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session

        // Check if this is a video upload payment
        if (session.metadata?.type === 'video_upload') {
          const videoId = session.metadata?.videoId || session.client_reference_id
          const mentorId = session.metadata?.mentorId

          if (!mentorId) {
            logger.error('No mentorId in async payment metadata', undefined, { videoId, sessionId: session.id })
            break
          }

          if (videoId) {
            // Get video details
            const { data: video, error: videoError } = await supabase
              .from('videos')
              .select('*, player_id')
              .eq('id', videoId)
              .single()

            if (videoError || !video) {
              logger.error('Video not found in async webhook', videoError, { videoId })
              break
            }

            // Verify mentor exists
            const { data: mentor, error: mentorError } = await supabase
              .from('profiles')
              .select('id, email, first_name, last_name')
              .eq('id', mentorId)
              .eq('role', 'mentor')
              .single()

            if (mentorError || !mentor) {
              logger.error('Invalid mentor in async webhook', mentorError, { mentorId, videoId })
              break
            }

            // Update video status to ready
            await supabase
              .from('videos')
              .update({
                status: 'ready',
              })
              .eq('id', videoId)

            // Create feedback submission if it doesn't exist
            const { data: existingSubmission } = await supabase
              .from('feedback_submissions')
              .select('id')
              .eq('video_id', videoId)
              .single()

            if (!existingSubmission) {
              const { data: submission, error: submissionError } = await supabase
                .from('feedback_submissions')
                .insert({
                  video_id: videoId,
                  player_id: video.player_id,
                  mentor_id: mentorId,
                  status: 'assigned', // Mark as assigned since mentor is selected
                  payment_status: 'completed',
                  payment_intent_id: session.id,
                })
                .select()
                .single()

              if (!submissionError && submission) {
                logger.info('Created feedback submission (async)', {
                  submissionId: submission.id,
                  videoId,
                  mentorId,
                })

                // Get player info
                const { data: playerProfile } = await supabase
                  .from('profiles')
                  .select('first_name, last_name, email')
                  .eq('id', video.player_id)
                  .single()

                const playerName = getFullName(playerProfile) || playerProfile?.email || 'Player'
                const playerEmail = playerProfile?.email

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

                logger.info('Async webhook emails processed', {
                  sent: emailResults.filter(r => r.success).length,
                  failed: emailResults.filter(r => !r.success).length,
                })
              }
            }

            await supabase
              .from('payments')
              .update({
                status: 'succeeded',
              })
              .eq('stripe_payment_intent_id', session.id)
          }
          break
        }

        // Otherwise, handle as feedback submission payment
        const submissionId = session.metadata?.submissionId || session.client_reference_id

        if (submissionId) {
          await supabase
            .from('feedback_submissions')
            .update({
              payment_status: 'completed',
              status: 'assigned',
            })
            .eq('id', submissionId)

          await supabase
            .from('payments')
            .update({
              status: 'succeeded',
            })
            .eq('stripe_payment_intent_id', session.id)
        }
        break
      }

      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session

        // Check if this is a video upload payment
        if (session.metadata?.type === 'video_upload') {
          const videoId = session.metadata?.videoId || session.client_reference_id

          if (videoId) {
            // Keep video in pending_payment status, can retry
            await supabase
              .from('payments')
              .update({
                status: 'failed',
              })
              .eq('stripe_payment_intent_id', session.id)
          }
          break
        }

        // Otherwise, handle as feedback submission payment
        const submissionId = session.metadata?.submissionId || session.client_reference_id

        if (submissionId) {
          await supabase
            .from('feedback_submissions')
            .update({
              payment_status: 'failed',
            })
            .eq('id', submissionId)

          await supabase
            .from('payments')
            .update({
              status: 'failed',
            })
            .eq('stripe_payment_intent_id', session.id)
        }
        break
      }

      default:
        logger.warn('Unhandled webhook event type', { eventType: event.type })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    return handleApiError(error)
  }
}
