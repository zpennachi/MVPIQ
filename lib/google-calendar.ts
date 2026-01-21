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
import { createClient } from '@/lib/supabase/server'

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
 * Get OAuth client for calendar owner (if connected)
 * Returns null if no OAuth tokens are available
 */
async function getOAuthClient(): Promise<{ client: any; calendarId: string } | null> {
  try {
    const supabase = await createClient()
    
    // Find admin user with connected Google Calendar
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('id, google_calendar_connected, google_calendar_id, google_calendar_access_token, google_calendar_refresh_token, google_calendar_token_expires_at')
      .eq('role', 'admin')
      .eq('google_calendar_connected', true)
      .single()

    if (!adminProfile?.google_calendar_access_token || !adminProfile?.google_calendar_refresh_token) {
      return null
    }

    // Check if token is expired and refresh if needed
    let accessToken = adminProfile.google_calendar_access_token
    const expiresAt = adminProfile.google_calendar_token_expires_at
    const now = new Date()
    
    if (expiresAt && new Date(expiresAt) <= now) {
      // Token expired, refresh it
      logger.info('OAuth token expired, refreshing...')
      
      if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
        logger.warn('Cannot refresh OAuth token - GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set')
        return null
      }

      const oauth2Client = new google.auth.OAuth2(
        env.GOOGLE_CLIENT_ID,
        env.GOOGLE_CLIENT_SECRET,
        '' // Redirect URI not needed for refresh
      )

      oauth2Client.setCredentials({
        refresh_token: adminProfile.google_calendar_refresh_token,
      })

      const { credentials } = await oauth2Client.refreshAccessToken()
      
      if (!credentials.access_token) {
        logger.error('Failed to refresh OAuth token')
        return null
      }

      accessToken = credentials.access_token

      // Update token in database
      const newExpiresAt = credentials.expiry_date 
        ? new Date(credentials.expiry_date).toISOString()
        : new Date(Date.now() + 3600 * 1000).toISOString()

      await supabase
        .from('profiles')
        .update({
          google_calendar_access_token: accessToken,
          google_calendar_token_expires_at: newExpiresAt,
          ...(credentials.refresh_token && { google_calendar_refresh_token: credentials.refresh_token }),
        })
        .eq('id', adminProfile.id)

      logger.info('OAuth token refreshed successfully')
    }

    // Create OAuth client
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return null
    }

    const oauth2Client = new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      ''
    )

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: adminProfile.google_calendar_refresh_token,
    })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    const calendarId = adminProfile.google_calendar_id || 'primary'

    return { client: calendar, calendarId }
  } catch (error: any) {
    logger.error('Failed to get OAuth client', error)
    return null
  }
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
  // Create event object
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

  // Try OAuth first (for Meet links with Gmail accounts)
  const oauthClient = await getOAuthClient()
  
  if (oauthClient) {
    logger.info('Using OAuth client for calendar event creation (supports Meet links)')
    try {
      const { client: calendar, calendarId } = oauthClient
      return await createEventWithMeetLink(calendar, calendarId, event, 'oauth')
    } catch (error: any) {
      logger.warn('Failed to create event with OAuth, falling back to service account', error)
      // Fall through to service account
    }
  }

  // Fallback to service account
  logger.info('Using service account for calendar event creation')
  try {
    const calendar = getCalendarClient()
    const calendarId = getServiceAccountCalendarId()
    return await createEventWithMeetLink(calendar, calendarId, event, 'service_account')
  } catch (error: any) {
    logger.error('Failed to create Google Calendar event', error, {
      summary: eventData.summary,
      startTime: eventData.startTime,
    })
    throw error
  }
}

/**
 * Helper function to create event with Meet link
 */
async function createEventWithMeetLink(
  calendar: any,
  calendarId: string,
  event: any,
  authType: 'oauth' | 'service_account'
): Promise<CalendarEventResult> {
  let response: any
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
      // Try multiple times with increasing delays as Meet link creation can be asynchronous
      if (!meetLink && response.data.id) {
        logger.info('Meet link not in initial response, will retry fetching', { eventId: response.data.id })
        
        // Try fetching multiple times with increasing delays
        const retryDelays = [2000, 3000, 5000] // 2s, 3s, 5s
        for (let i = 0; i < retryDelays.length && !meetLink; i++) {
          await new Promise(resolve => setTimeout(resolve, retryDelays[i]))
          
          try {
            const fetchedEvent = await calendar.events.get({
              calendarId,
              eventId: response.data.id,
            })
            
            const fetchedData = fetchedEvent.data as any
            meetLink = fetchedData.conferenceData?.entryPoints?.find(
              (ep: any) => ep.entryPointType === 'video'
            )?.uri || ''
            
            if (meetLink) {
              logger.info('Meet link retrieved from fetched event', { 
                eventId: response.data.id, 
                meetLink,
                attempt: i + 1,
                delay: retryDelays[i],
                authType,
              })
              break
            } else {
              logger.warn(`Meet link still not available after attempt ${i + 1}`, {
                eventId: response.data.id,
                hasConferenceData: !!fetchedData.conferenceData,
                authType,
              })
            }
          } catch (fetchError: any) {
            logger.warn(`Failed to fetch event for Meet link (attempt ${i + 1})`, { 
              error: fetchError, 
              eventId: response.data.id,
              authType,
            })
          }
        }
      }
      
      // Log the full response for debugging
      logger.info('Calendar event created with conference data', {
        eventId: response.data.id,
        hasConferenceData: !!response.data.conferenceData,
        conferenceDataKeys: response.data.conferenceData ? Object.keys(response.data.conferenceData) : [],
        entryPoints: response.data.conferenceData?.entryPoints,
        entryPointsCount: response.data.conferenceData?.entryPoints?.length || 0,
        meetLink,
        fullConferenceData: JSON.stringify(response.data.conferenceData),
      })
      
      // If still no Meet link after fetching, log detailed info
      if (!meetLink) {
        logger.error('Meet link not generated - possible causes:', {
          eventId: response.data.id,
          calendarId,
          serviceAccountEmail: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          possibleCauses: [
            'Calendar owner may not have Google Meet enabled/licensed',
            'Service account may need domain-wide delegation with impersonation',
            'Calendar may not support Google Meet',
            'Meet link creation may be asynchronous - try fetching event again later',
          ],
          conferenceData: response.data.conferenceData,
        })
      }
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
            authType,
          })
        } catch (error2: any) {
          // If that also fails, create event without conference data and log the issue
          logger.error('Failed to create event with conference data', error2, { calendarId, authType })
          throw new Error(`Cannot create Google Meet link: ${error2.message || 'Unknown error'}. Make sure the calendar supports Google Meet.`)
        }
      } else {
        throw error
      }
    }

    if (!response.data.id) {
      throw new Error('Failed to create calendar event: no event ID returned')
    }
    
    // If we still don't have a Meet link, log a warning but don't fail
    if (!meetLink && authType === 'oauth') {
      logger.warn('Calendar event created with OAuth but no Meet link generated', {
        eventId: response.data.id,
        calendarId,
        hint: 'Calendar might not support Google Meet or Meet might not be enabled'
      })
    }

    logger.info('Google Calendar event created', {
      eventId: response.data.id,
      meetLink,
      calendarId,
      authType,
    })

    return {
      eventId: response.data.id,
      meetLink: meetLink || '',
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
