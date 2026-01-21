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
 * Get calendar ID
 * If GOOGLE_CALENDAR_ID is set, use that (should be a calendar shared with the service account)
 * Otherwise, use 'primary' (the service account's own calendar)
 */
function getServiceAccountCalendarId(): string {
  // Use the shared calendar if specified, otherwise use service account's primary
  // The shared calendar should be the one you shared with the service account email
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

    // Create event with Google Meet
    // Try different approaches to create Meet link
    let response
    let meetLink = ''
    
    // First, try creating event with conference data using the standard format
    try {
      response = await calendar.events.insert({
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
      
      // Extract Meet link
      meetLink = response.data.conferenceData?.entryPoints?.find(
        (ep: any) => ep.entryPointType === 'video'
      )?.uri || ''
      
      // Sometimes Google doesn't return the Meet link immediately in the insert response
      // Fetch the event again to get the Meet link if it wasn't in the initial response
      if (!meetLink && response.data.id) {
        logger.info('Meet link not in initial response, fetching event again', { eventId: response.data.id })
        
        // Wait a moment for Google to process the conference data
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        try {
          const fetchedEvent = await calendar.events.get({
            calendarId,
            eventId: response.data.id,
          })
          
          meetLink = (fetchedEvent.data as any).conferenceData?.entryPoints?.find(
            (ep: any) => ep.entryPointType === 'video'
          )?.uri || ''
          
          if (meetLink) {
            logger.info('Meet link retrieved from fetched event', { eventId: response.data.id, meetLink })
          } else {
            logger.warn('Meet link still not available after fetching', {
              eventId: response.data.id,
              hasConferenceData: !!(fetchedEvent.data as any).conferenceData,
            })
          }
        } catch (fetchError: any) {
          logger.warn('Failed to fetch event for Meet link', { error: fetchError, eventId: response.data.id })
        }
      }
      
      // Log the full response for debugging
      logger.info('Calendar event created with conference data', {
        eventId: response.data.id,
        hasConferenceData: !!response.data.conferenceData,
        meetLink,
      })
    } catch (error: any) {
      // If that fails with "Invalid conference type", try without specifying type
      if (error.message?.includes('conference type') || error.code === 400) {
        logger.warn('Failed with hangoutsMeet type, trying without explicit type', { error: error.message })
        
        try {
          // Try with just the createRequest, let Google decide the type
          response = await calendar.events.insert({
            calendarId,
            conferenceDataVersion: 1,
            requestBody: {
              ...event,
              conferenceData: {
                createRequest: {
                  requestId: `mvpiq-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                },
              },
            },
          })
          
          meetLink = response.data.conferenceData?.entryPoints?.find(
            (ep: any) => ep.entryPointType === 'video'
          )?.uri || ''
          
          logger.info('Calendar event created with minimal conference data', {
            eventId: response.data.id,
            hasConferenceData: !!response.data.conferenceData,
            meetLink,
          })
        } catch (error2: any) {
          // If that also fails, create event without conference data and log the issue
          logger.error('Failed to create event with conference data', error2, { calendarId })
          throw new Error(`Cannot create Google Meet link: ${error2.message || 'Unknown error'}. Make sure the calendar supports Google Meet and is shared with the service account.`)
        }
      } else {
        throw error
      }
    }

    if (!response.data.id) {
      throw new Error('Failed to create calendar event: no event ID returned')
    }
    
    // If we still don't have a Meet link, log a warning but don't fail
    if (!meetLink) {
      logger.warn('Calendar event created but no Meet link generated', {
        eventId: response.data.id,
        calendarId,
        hint: 'Calendar might not support Google Meet, or service account lacks permissions'
      })
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
