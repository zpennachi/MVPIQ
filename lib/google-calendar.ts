/**
 * Google Calendar Integration Utilities
 * 
 * Handles creating calendar events with Google Meet links
 * using the mentor's Google OAuth credentials.
 */

import { google } from 'googleapis'
import { env } from './env'

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
 * Refresh an expired Google OAuth access token
 */
export async function refreshAccessToken(
  oauthConfig: {
    clientId: string
    clientSecret: string
    redirectUri: string
  },
  refreshToken: string
): Promise<string> {
  const oauth2Client = new google.auth.OAuth2(
    oauthConfig.clientId,
    oauthConfig.clientSecret,
    oauthConfig.redirectUri
  )

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  })

  const { credentials } = await oauth2Client.refreshAccessToken()
  
  if (!credentials.access_token) {
    throw new Error('Failed to refresh access token')
  }

  return credentials.access_token
}

/**
 * Create a Google Calendar event with Google Meet link
 * 
 * @param accessToken - Mentor's Google OAuth access token
 * @param calendarId - Calendar ID (usually 'primary' for default calendar)
 * @param eventData - Event details
 * @returns Event ID and Meet link
 */
export async function createCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventData: CalendarEventData
): Promise<CalendarEventResult> {
  const oauth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID!,
    env.GOOGLE_CLIENT_SECRET!,
    env.GOOGLE_REDIRECT_URI
  )

  oauth2Client.setCredentials({
    access_token: accessToken,
  })

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  // Create calendar event with Google Meet
  const event = {
    summary: eventData.summary,
    description: eventData.description || `Scheduled mentoring session via MVP-IQ`,
    start: {
      dateTime: eventData.startTime.toISOString(),
      timeZone: 'UTC',
    },
    end: {
      dateTime: eventData.endTime.toISOString(),
      timeZone: 'UTC',
    },
    attendees: [
      { email: eventData.mentorEmail },
      { email: eventData.userEmail },
    ],
    conferenceData: {
      createRequest: {
        requestId: `mvpiq-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        conferenceSolutionKey: {
          type: 'hangoutsMeet',
        },
      },
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 }, // 1 day before
        { method: 'popup', minutes: 15 }, // 15 minutes before
      ],
    },
  }

  const response = await calendar.events.insert({
    calendarId: calendarId || 'primary',
    conferenceDataVersion: 1,
    requestBody: event,
  })

  // Extract Meet link from response
  const meetLink =
    response.data.conferenceData?.entryPoints?.find(
      (ep: any) => ep.entryPointType === 'video'
    )?.uri || ''

  if (!response.data.id) {
    throw new Error('Failed to create calendar event: no event ID returned')
  }

  return {
    eventId: response.data.id,
    meetLink: meetLink || '',
  }
}

/**
 * Get calendar ID for a user (defaults to 'primary')
 */
export function getCalendarId(calendarId?: string | null): string {
  return calendarId || 'primary'
}
