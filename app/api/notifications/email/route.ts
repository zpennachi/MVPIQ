import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { env, isResendConfigured } from '@/lib/env'
import { emailNotificationSchema } from '@/lib/validations'
import { handleApiError, ValidationError } from '@/lib/errors'
import { logger } from '@/lib/logger'

const resend = isResendConfigured() ? new Resend(env.RESEND_API_KEY!) : null

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, email, data } = emailNotificationSchema.parse(body)

    if (!isResendConfigured() || !resend) {
      logger.warn('Resend API key not configured', { type, email })
      return NextResponse.json(
        { error: 'Email service not configured', warning: 'RESEND_API_KEY not set' },
        { status: 503 }
      )
    }

    logger.info('Sending email notification', { type, recipient: email })

    // Example email templates (you would send these via your email service)
    let subject = ''
    let html = ''

    switch (type) {
      case 'payment_confirmation':
        subject = 'Payment Confirmation - Football Feedback'
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #FFD700;">Payment Received</h2>
            <p>Hi there,</p>
            <p>Your payment of $${(data.amount / 100).toFixed(2)} has been confirmed.</p>
            <p><strong>Submission ID:</strong> ${data.submissionId}</p>
            <p><strong>Video:</strong> ${data.videoTitle || 'N/A'}</p>
            <p>Your feedback request has been submitted and will be reviewed by our professional athletes.</p>
            <p>You'll receive another email when feedback is ready!</p>
          </div>
        `
        break

      case 'submission_success':
        subject = 'Video Submission Successful - MVP-IQ'
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #1a1a1a; color: #fff;">
            <h2 style="color: #FFD700; margin-bottom: 20px;">Submission Received</h2>
            <p>Hi there,</p>
            <p>Your video has been successfully submitted for professional feedback!</p>
            <div style="background: #2a2a2a; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong style="color: #FFD700;">Video:</strong> ${data.videoTitle || 'N/A'}</p>
            </div>
            <p>Your submission is now being reviewed by our professional mentors. You'll receive detailed feedback within 48-72 hours.</p>
            <p style="margin: 20px 0;">
              <a href="${data.dashboardLink || env.NEXT_PUBLIC_APP_URL}/dashboard/feedback" style="background: #FFD700; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">View Your Submissions</a>
            </p>
            <p>Thank you for using MVP-IQ!</p>
          </div>
        `
        break

      case 'feedback_ready':
        subject = 'Your Feedback is Ready! - Football Feedback'
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #FFD700;">Feedback Ready</h2>
            <p>Hi there,</p>
            <p>Great news! Your feedback is ready.</p>
            <p><strong>Video:</strong> ${data.videoTitle || 'N/A'}</p>
            <p><strong>Rating:</strong> ${data.rating}/5 stars</p>
            <p><a href="${env.NEXT_PUBLIC_APP_URL}/dashboard" style="background: #FFD700; color: #000; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">View Feedback</a></p>
          </div>
        `
        break

      case 'new_submission':
        subject = 'New Feedback Submission - MVP-IQ'
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #1a1a1a; color: #fff;">
            <h2 style="color: #FFD700; margin-bottom: 20px;">New Submission Assigned</h2>
            <p>Hi ${data.mentorName || 'Mentor'},</p>
            <p>You have a new feedback submission waiting for review.</p>
            <div style="background: #2a2a2a; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong style="color: #FFD700;">Video:</strong> ${data.videoTitle || 'N/A'}</p>
              <p style="margin: 5px 0;"><strong style="color: #FFD700;">Player:</strong> ${data.playerName || 'N/A'}</p>
            </div>
            <p style="margin: 20px 0;">
              <a href="${data.dashboardLink || env.NEXT_PUBLIC_APP_URL}/dashboard" style="background: #FFD700; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Review Submission</a>
            </p>
          </div>
        `
        break

      case 'pro_feedback_draft':
        subject = `Feedback Request: ${data.videoTitle || 'Video Submission'}`
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #1a1a1a; color: #fff;">
            <h2 style="color: #FFD700; margin-bottom: 20px;">New Feedback Request</h2>
            
            <div style="background: #2a2a2a; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
              <p style="margin: 5px 0;"><strong style="color: #FFD700;">Player:</strong> ${data.playerName || 'N/A'}</p>
              <p style="margin: 5px 0;"><strong style="color: #FFD700;">Video Title:</strong> ${data.videoTitle || 'N/A'}</p>
              <p style="margin: 5px 0;"><strong style="color: #FFD700;">Player Numbers:</strong> ${data.playerNumbers || 'Not specified'}</p>
            </div>

            <div style="background: #2a2a2a; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
              <h3 style="color: #FFD700; margin-top: 0;">Player Notes:</h3>
              <p style="white-space: pre-wrap;">${data.playerNotes || 'No specific notes provided'}</p>
            </div>

            <div style="background: #2a2a2a; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
              <h3 style="color: #FFD700; margin-top: 0;">Video URL:</h3>
              <p><a href="${data.videoUrl}" style="color: #FFD700; text-decoration: underline;">${data.videoUrl}</a></p>
            </div>

            <div style="border-top: 2px dashed #FFD700; padding-top: 20px; margin-top: 30px;">
              <h3 style="color: #FFD700; margin-top: 0;">Provide your feedback below this line:</h3>
              <div style="background: #1a1a1a; padding: 15px; border: 1px solid #444; border-radius: 5px; min-height: 200px; margin-top: 10px;">
                <p style="color: #888; font-style: italic;">[Type your feedback here]</p>
              </div>
              <p style="color: #888; font-size: 12px; margin-top: 10px;">
                You can add a feedback video URL below your text if you have a marked-up video to share.
              </p>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #444;">
              <p style="color: #888; font-size: 12px;">
                <strong>Instructions:</strong><br>
                1. Review the video at the URL above<br>
                2. Provide your feedback in the section above<br>
                3. Optionally add a feedback video URL if you have one<br>
                4. Delete the top part of this email (everything above your feedback)<br>
                5. Reply to this email to send your feedback back to the platform
              </p>
            </div>
          </div>
        `
        break

      case 'session_confirmation':
        subject = 'Session Booking Confirmed - MVP-IQ'
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #FFD700;">Session Confirmed!</h2>
            <p>Hi there,</p>
            <p>Your 1-on-1 session has been confirmed!</p>
            <p><strong>Mentor:</strong> ${data.mentorName || 'Professional Athlete'}</p>
            <p><strong>Scheduled Time:</strong> ${new Date(data.startTime).toLocaleString()}</p>
            <p>You'll receive meeting details closer to the session date.</p>
            <p><a href="${env.NEXT_PUBLIC_APP_URL}/dashboard" style="background: #FFD700; color: #000; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">View Session</a></p>
          </div>
        `
        break

      case 'session_booking_notification':
        subject = 'New Session Booking - MVP-IQ'
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #FFD700;">New Session Booking</h2>
            <p>Hi there,</p>
            <p>You have a new 1-on-1 session booking!</p>
            <p><strong>Client:</strong> ${data.userName || 'User'}</p>
            <p><strong>Scheduled Time:</strong> ${new Date(data.startTime).toLocaleString()}</p>
            <p><a href="${env.NEXT_PUBLIC_APP_URL}/dashboard" style="background: #FFD700; color: #000; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">View Booking</a></p>
          </div>
        `
        break

      case 'session_reminder':
        subject = 'Reminder: Your Session is Today - MVP-IQ'
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #FFD700;">Session Reminder</h2>
            <p>Hi there,</p>
            <p>This is a reminder that you have a 1-on-1 session scheduled for today!</p>
            <p><strong>Mentor:</strong> ${data.mentorName || 'Professional Athlete'}</p>
            <p><strong>Scheduled Time:</strong> ${new Date(data.startTime).toLocaleString()}</p>
            ${data.meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${data.meetingLink}">${data.meetingLink}</a></p>` : ''}
            <p>We look forward to seeing you!</p>
            <p><a href="${env.NEXT_PUBLIC_APP_URL}/dashboard/calendar" style="background: #FFD700; color: #000; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">View Appointments</a></p>
          </div>
        `
        break

      case 'session_cancelled':
        subject = 'Session Cancelled - MVP-IQ'
        const rescheduleLink = data.rescheduleLink || `${env.NEXT_PUBLIC_APP_URL}/dashboard/calendar`
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #1a1a1a; color: #fff;">
            <h2 style="color: #FFD700; margin-bottom: 20px;">Session Cancelled</h2>
            <p>Hi ${data.userName || 'there'},</p>
            <p>We're sorry to inform you that your 1-on-1 session has been cancelled.</p>
            <div style="background: #2a2a2a; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong style="color: #FFD700;">Mentor:</strong> ${data.mentorName || 'Professional Athlete'}</p>
              <p style="margin: 5px 0;"><strong style="color: #FFD700;">Scheduled Time:</strong> ${new Date(data.startTime).toLocaleString()}</p>
            </div>
            <div style="background: #2a5a2a; border-left: 4px solid #4ade80; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #4ade80; font-weight: bold;">✓ Session Credit Added</p>
              <p style="margin: 5px 0 0 0; color: #d1fae5; font-size: 14px;">
                We've added 1 session credit to your account. You can reschedule for free - no payment required!
              </p>
            </div>
            <p>We understand this may be inconvenient. You can reschedule your session using the link below:</p>
            <p style="margin: 20px 0;">
              <a href="${rescheduleLink}" style="background: #FFD700; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reschedule Session (Free with Credit)</a>
            </p>
            <p style="color: #888; font-size: 12px; margin-top: 20px;">
              This is a one-time use link. If you have any questions, please contact support.
            </p>
            <p style="margin-top: 20px;">
              <a href="${env.NEXT_PUBLIC_APP_URL}/contact" style="color: #FFD700; text-decoration: underline;">Contact Support</a>
            </p>
          </div>
        `
        break

      default:
        return NextResponse.json(
          { error: 'Invalid notification type' },
          { status: 400 }
        )
    }

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: email,
      subject,
      html,
    })

    if (emailError) {
      logger.error('Resend API error', emailError, { type, recipient: email })
      throw new ValidationError(`Failed to send email: ${emailError.message}`, emailError)
    }

    logger.info('Email sent successfully', {
      type,
      recipient: email,
      emailId: emailData?.id,
    })

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      emailId: emailData?.id,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
