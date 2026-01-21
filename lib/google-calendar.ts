/**
 * Google Calendar API Service
 * Handles all Google Calendar interactions for the app
 */

import { google } from 'googleapis'

export interface GoogleCalendarConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export interface MentorCalendar {
  mentorId: string
  accessToken: string
  refreshToken: string
  calendarId: string
  email: string
}

/**
 * Create OAuth2 client for Google Calendar
 */
export function createOAuth2Client(config: GoogleCalendarConfig) {
  return new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri
  )
}

/**
 * Get OAuth2 authorization URL
 */
export function getAuthUrl(config: GoogleCalendarConfig): string {
  const oauth2Client = createOAuth2Client(config)
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
    prompt: 'consent', // Force consent to get refresh token
  })
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  config: GoogleCalendarConfig,
  code: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const oauth2Client = createOAuth2Client(config)
  
  const { tokens } = await oauth2Client.getToken(code)
  
  if (!tokens.access_token) {
    throw new Error('No access token received')
  }
  
  if (!tokens.refresh_token) {
    throw new Error('No refresh token received - user may have already authorized')
  }
  
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  config: GoogleCalendarConfig,
  refreshToken: string
): Promise<string> {
  const oauth2Client = createOAuth2Client(config)
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  
  const { credentials } = await oauth2Client.refreshAccessToken()
  
  if (!credentials.access_token) {
    throw new Error('Failed to refresh access token')
  }
  
  return credentials.access_token
}

/**
 * Get authenticated calendar client
 */
export function getCalendarClient(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2()
  oauth2Client.setCredentials({ access_token: accessToken })
  
  return google.calendar({ version: 'v3', auth: oauth2Client })
}

/**
 * Get user's calendar list (to find primary calendar)
 */
export async function getPrimaryCalendarId(accessToken: string): Promise<string> {
  const calendar = getCalendarClient(accessToken)
  
  const { data } = await calendar.calendarList.list()
  
  // Find primary calendar
  const primaryCalendar = data.items?.find(cal => cal.primary) || data.items?.[0]
  
  if (!primaryCalendar?.id) {
    throw new Error('No calendar found')
  }
  
  return primaryCalendar.id
}

/**
 * Get available time slots from Google Calendar using Free/Busy API
 */
export async function getAvailableSlots(
  accessToken: string,
  calendarId: string,
  startDate: Date,
  endDate: Date,
  durationMinutes: number = 60
): Promise<Array<{ start: Date; end: Date }>> {
  const calendar = getCalendarClient(accessToken)
  const oauth2Client = new google.auth.OAuth2()
  oauth2Client.setCredentials({ access_token: accessToken })
  
  // Use FreeBusy API to find free time
  const freeBusy = google.calendar({ version: 'v3', auth: oauth2Client })
  
  const response = await freeBusy.freebusy.query({
    requestBody: {
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      items: [{ id: calendarId }],
    },
  })
  
  const busyTimes = response.data.calendars?.[calendarId]?.busy || []
  
  // Calculate free slots
  const freeSlots: Array<{ start: Date; end: Date }> = []
  let currentTime = new Date(startDate)
  
  while (currentTime < endDate) {
    const slotEnd = new Date(currentTime.getTime() + durationMinutes * 60 * 1000)
    
    // Check if this time slot conflicts with busy times
    const isFree = !busyTimes.some(busy => {
      const busyStart = new Date(busy.start || '')
      const busyEnd = new Date(busy.end || '')
      
      // Check for overlap
      return (
        (currentTime >= busyStart && currentTime < busyEnd) ||
        (slotEnd > busyStart && slotEnd <= busyEnd) ||
        (currentTime <= busyStart && slotEnd >= busyEnd)
      )
    })
    
    if (isFree && slotEnd <= endDate) {
      freeSlots.push({
        start: new Date(currentTime),
        end: new Date(slotEnd),
      })
    }
    
    // Move to next 30-minute slot
    currentTime = new Date(currentTime.getTime() + 30 * 60 * 1000)
  }
  
  return freeSlots
}

/**
 * Create a calendar event with Google Meet link
 */
export async function createCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventData: {
    summary: string
    description?: string
    startTime: Date
    endTime: Date
    mentorEmail: string
    userEmail: string
    mentorName: string
    userName: string
  }
): Promise<{ eventId: string; meetLink: string | null }> {
  const calendar = getCalendarClient(accessToken)
  
  const event = {
    summary: eventData.summary,
    description: eventData.description || `Scheduled session via MVP-IQ`,
    start: {
      dateTime: eventData.startTime.toISOString(),
      timeZone: 'UTC',
    },
    end: {
      dateTime: eventData.endTime.toISOString(),
      timeZone: 'UTC',
    },
    attendees: [
      { email: eventData.mentorEmail, organizer: true },
      { email: eventData.userEmail },
    ],
    conferenceData: {
      createRequest: {
        requestId: `mvpiq-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        conferenceSolutionKey: {
          type: 'hangoutsMeet' as const,
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
    calendarId,
    conferenceDataVersion: 1,
    requestBody: event,
  })
  
  // Extract Meet link
  const meetLink = response.data.conferenceData?.entryPoints?.find(
    (ep: any) => ep.entryPointType === 'video'
  )?.uri || null
  
  return {
    eventId: response.data.id || '',
    meetLink,
  }
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  const calendar = getCalendarClient(accessToken)
  
  await calendar.events.delete({
    calendarId,
    eventId,
  })
}

/**
 * Get calendar event by ID
 */
export async function getCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<any> {
  const calendar = getCalendarClient(accessToken)
  
  const response = await calendar.events.get({
    calendarId,
    eventId,
  })
  
  return response.data
}
