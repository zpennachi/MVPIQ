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
  // Fallback if Google Calendar not configured
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
    throw new Error('Google Calendar integration is not configured')
  }

  const oauth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
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

/**
 * Delete a Google Calendar event
 */
export async function deleteCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  // Fallback if Google Calendar not configured
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
    throw new Error('Google Calendar integration is not configured')
  }

  const oauth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  )

  oauth2Client.setCredentials({
    access_token: accessToken,
  })

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  await calendar.events.delete({
    calendarId: calendarId || 'primary',
    eventId: eventId,
  })
}

/**
 * Get Google OAuth authorization URL
 */
export function getAuthUrl(config: {
  clientId: string
  clientSecret: string
  redirectUri: string
}): string {
  const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri
  )

  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ]

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
  })
}

/**
 * Get available time slots from Google Calendar Free/Busy API
 */
export async function getAvailableSlots(
  accessToken: string,
  calendarId: string,
  startDate: Date,
  endDate: Date,
  durationMinutes: number = 60
): Promise<Array<{ start: Date; end: Date }>> {
  // Fallback if Google Calendar not configured - return empty array
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
    return []
  }

  const oauth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  )

  oauth2Client.setCredentials({
    access_token: accessToken,
  })

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  // Get busy times from Google Calendar
  const freebusyResponse = await calendar.freebusy.query({
    requestBody: {
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      items: [{ id: calendarId || 'primary' }],
    },
  })

  const busyTimes = freebusyResponse.data.calendars?.[calendarId || 'primary']?.busy || []

  // Convert busy times to Date objects
  const busyRanges = busyTimes.map(busy => ({
    start: new Date(busy.start || ''),
    end: new Date(busy.end || ''),
  }))

  // Generate available slots
  const availableSlots: Array<{ start: Date; end: Date }> = []
  const currentTime = new Date(startDate)
  const endTime = new Date(endDate)

  while (currentTime < endTime) {
    const slotEnd = new Date(currentTime.getTime() + durationMinutes * 60 * 1000)

    // Check if this slot conflicts with any busy time
    const isAvailable = !busyRanges.some(busy => {
      return (
        (currentTime >= busy.start && currentTime < busy.end) ||
        (slotEnd > busy.start && slotEnd <= busy.end) ||
        (currentTime <= busy.start && slotEnd >= busy.end)
      )
    })

    if (isAvailable && slotEnd <= endTime) {
      availableSlots.push({
        start: new Date(currentTime),
        end: new Date(slotEnd),
      })
    }

    // Move to next 30-minute interval
    currentTime.setMinutes(currentTime.getMinutes() + 30)
  }

  return availableSlots
}

/**
 * Exchange OAuth code for access and refresh tokens
 */
export async function exchangeCodeForTokens(
  config: {
    clientId: string
    clientSecret: string
    redirectUri: string
  },
  code: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri
  )

  const { tokens } = await oauth2Client.getToken(code)

  if (!tokens.access_token) {
    throw new Error('Failed to get access token')
  }

  if (!tokens.refresh_token) {
    throw new Error('Failed to get refresh token')
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
  }
}

/**
 * Get the primary calendar ID for a user
 */
export async function getPrimaryCalendarId(accessToken: string): Promise<string> {
  // Fallback if Google Calendar not configured
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
    return 'primary'
  }

  const oauth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  )

  oauth2Client.setCredentials({
    access_token: accessToken,
  })

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  // Get calendar list to find primary calendar
  const response = await calendar.calendarList.list()

  // Find primary calendar
  const primaryCalendar = response.data.items?.find(cal => cal.primary === true)

  return primaryCalendar?.id || 'primary'
}
