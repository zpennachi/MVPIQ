/**
 * Centralized email sending utility
 * Replaces duplicated email sending logic across the codebase
 */

import { env } from './env'
import { logger } from './logger'
import { emailNotificationSchema, type EmailType } from './validations'

interface EmailData {
  [key: string]: unknown
}

interface SendEmailResult {
  success: boolean
  error?: string
  emailId?: string
}

/**
 * Send an email notification via the email API
 */
export async function sendEmail(
  type: EmailType,
  recipient: string,
  data?: EmailData
): Promise<SendEmailResult> {
  // Gmail is now the email service (no configuration check needed)

  try {
    const response = await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/notifications/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        email: recipient,
        data: data || {},
      }),
    })

    if (!response.ok) {
      let errorData: { error?: string } = {}
      try {
        errorData = await response.json()
      } catch {
        errorData = { error: `HTTP ${response.status}` }
      }

      logger.error('Failed to send email', undefined, {
        type,
        recipient,
        status: response.status,
        error: errorData.error,
      })

      return {
        success: false,
        error: errorData.error || 'Failed to send email',
      }
    }

    const result = await response.json()
    logger.info('Email sent successfully', {
      type,
      recipient,
      emailId: result.emailId,
    })

    return {
      success: true,
      emailId: result.emailId,
    }
  } catch (error) {
    logger.error('Exception sending email', error, { type, recipient })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send multiple emails in parallel
 */
export async function sendEmails(
  emails: Array<{ type: EmailType; recipient: string; data?: EmailData }>
): Promise<Array<SendEmailResult & { recipient: string }>> {
  const results = await Promise.allSettled(
    emails.map(({ type, recipient, data }) =>
      sendEmail(type, recipient, data).then(result => ({
        ...result,
        recipient,
      }))
    )
  )

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    } else {
      logger.error('Email promise rejected', result.reason, {
        recipient: emails[index]?.recipient,
      })
      return {
        success: false,
        error: result.reason?.message || 'Unknown error',
        recipient: emails[index]?.recipient || 'unknown',
      }
    }
  })
}
