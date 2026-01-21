/**
 * Google Calendar Integration Utilities
 * 
 * Uses a single service account (web@mvpiq.com) to generate all Google Meet links
 * for sessions. This simplifies setup and removes the need for mentors to connect
 * their own Google accounts.
 */

import { google } from 'googleapis'
import { env } from './env'
import { logger } from './logger'

export interface CalendarEventData {
  summary: string
  description?: string
  startTime: Date
  endTime: Date
  mentorEmail: string
  userEmail: string
  mentorName: string
  userName: string
}

export interface CalendarEventResult {
  eventId: string
  meetLink: string
}

/**
 * Get authenticated Google Calendar client using service account
 */
function getCalendarClient() {
  // Fallback if service account not configured
  if (!env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    throw new Error('Google Calendar service account is not configured. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY')
  }

  // Parse the private key (handle newlines)
  const privateKey = env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n')

  const auth = new google.auth.JWT({
    email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
  })

  return google.calendar({ version: 'v3', auth })
}

/**
 * Get calendar ID (defaults to service account's primary calendar)
 */
function getServiceAccountCalendarId(): string {
  return env.GOOGLE_CALENDAR_ID || 'primary'
}

/**
 * Create a Google Calendar event with Google Meet link
 * 
 * @param eventData - Event details
 * @returns Event ID and Meet link
 */
export async function createCalendarEvent(
  eventData: CalendarEventData
): Promise<CalendarEventResult> {
  try {
    const calendar = getCalendarClient()
    const calendarId = getServiceAccountCalendarId()

    // Create a simple calendar event first (without conference data)
    const event = {
      summary: eventData.summary,
      description: `${eventData.description || 'Scheduled mentoring session via MVP-IQ'}\n\nParticipants:\n- Mentor: ${eventData.mentorEmail}\n- Student: ${eventData.userEmail}`,
      start: {
        dateTime: eventData.startTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: eventData.endTime.toISOString(),
        timeZone: 'UTC',
      },
    }

    // Create event with Google Meet - try the simplest possible format
    const response = await calendar.events.insert({
      calendarId,
      conferenceDataVersion: 1,
      requestBody: {
        ...event,
        conferenceData: {
          createRequest: {
            requestId: `mvpiq-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet',
            },
          },
        },
      },
    })

    // Extract Meet link from response
    const meetLink =
      response.data.conferenceData?.entryPoints?.find(
        (ep: any) => ep.entryPointType === 'video'
      )?.uri || ''

    if (!response.data.id) {
      throw new Error('Failed to create calendar event: no event ID returned')
    }

    logger.info('Google Calendar event created', {
      eventId: response.data.id,
      meetLink,
      calendarId,
    })

    return {
      eventId: response.data.id,
      meetLink: meetLink || '',
    }
  } catch (error: any) {
    logger.error('Failed to create Google Calendar event', error, {
      summary: eventData.summary,
      startTime: eventData.startTime,
    })
    throw error
  }
}

/**
 * Delete a Google Calendar event
 */
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  try {
    const calendar = getCalendarClient()
    const calendarId = getServiceAccountCalendarId()

    await calendar.events.delete({
      calendarId,
      eventId,
    })

    logger.info('Google Calendar event deleted', { eventId, calendarId })
  } catch (error: any) {
    logger.error('Failed to delete Google Calendar event', error, { eventId })
    throw error
  }
}

// Legacy functions kept for backward compatibility but deprecated
// These are no longer used but kept to avoid breaking existing code

/**
 * @deprecated Use createCalendarEvent directly with service account
 */
export async function refreshAccessToken(): Promise<string> {
  throw new Error('refreshAccessToken is deprecated. Service account authentication is used instead.')
}

/**
 * @deprecated No longer needed with service account - always uses service account calendar
 */
export function getCalendarId(calendarId?: string | null): string {
  return getServiceAccountCalendarId()
}

/**
 * @deprecated No longer needed with service account
 */
export function getAuthUrl(): string {
  throw new Error('getAuthUrl is deprecated. Service account authentication is used instead.')
}

/**
 * @deprecated No longer needed with service account
 */
export async function getAvailableSlots(): Promise<Array<{ start: Date; end: Date }>> {
  return []
}

/**
 * @deprecated No longer needed with service account
 */
export async function exchangeCodeForTokens(): Promise<{ accessToken: string; refreshToken: string }> {
  throw new Error('exchangeCodeForTokens is deprecated. Service account authentication is used instead.')
}

/**
 * @deprecated No longer needed with service account
 */
export async function getPrimaryCalendarId(): Promise<string> {
  return getServiceAccountCalendarId()
}
