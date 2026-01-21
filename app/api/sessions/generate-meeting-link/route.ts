import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCalendarEvent, refreshAccessToken, getCalendarId } from '@/lib/google-calendar'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * POST /api/sessions/generate-meeting-link
 * Generate a Google Meet link for a session immediately upon creation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      logger.error('Missing sessionId in request', undefined, { body })
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    logger.info('Generate meeting link called', { sessionId })

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      logger.error('Auth error in generate-meeting-link', authError, { sessionId })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('booked_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      logger.error('Session not found or error fetching session', sessionError, { sessionId })
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Verify user owns this session
    if (session.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get mentor profile separately
    const { data: mentor, error: mentorError } = await supabase
      .from('profiles')
      .select('id, email, full_name, google_calendar_connected, google_calendar_access_token, google_calendar_refresh_token, google_calendar_id, google_calendar_token_expires_at')
      .eq('id', session.mentor_id)
      .single()

    if (mentorError || !mentor) {
      logger.error('Mentor not found', mentorError, { mentorId: session.mentor_id })
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 })
    }

    // Generate Google Calendar event with Meet link (if mentor has connected calendar)
    let meetingLink: string | null = null
    let googleEventId: string | undefined = undefined

    if (mentor?.google_calendar_connected && mentor.google_calendar_access_token) {
      try {
        // Check if token is expired and refresh if needed
        let accessToken = mentor.google_calendar_access_token
        const tokenExpiresAt = mentor.google_calendar_token_expires_at
          ? new Date(mentor.google_calendar_token_expires_at)
          : null

        if (tokenExpiresAt && tokenExpiresAt < new Date() && mentor.google_calendar_refresh_token) {
          try {
            if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI) {
              accessToken = await refreshAccessToken(
                {
                  clientId: env.GOOGLE_CLIENT_ID,
                  clientSecret: env.GOOGLE_CLIENT_SECRET,
                  redirectUri: env.GOOGLE_REDIRECT_URI,
                },
                mentor.google_calendar_refresh_token
              )

              // Update stored token
              await supabase
                .from('profiles')
                .update({
                  google_calendar_access_token: accessToken,
                  google_calendar_token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
                })
                .eq('id', mentor.id)

              logger.info('Refreshed Google Calendar access token', { mentorId: mentor.id })
            }
          } catch (refreshError: any) {
            logger.error('Failed to refresh Google Calendar token', refreshError, { mentorId: mentor.id })
          }
        }

        // Get user details
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', session.user_id)
          .single()

        // Create calendar event
        const { eventId, meetLink } = await createCalendarEvent(
          accessToken,
          getCalendarId(mentor.google_calendar_id),
          {
            summary: `1-on-1 Session: ${userProfile?.full_name || 'Student'} with ${mentor.full_name || 'Mentor'}`,
            description: `Scheduled mentoring session via MVP-IQ`,
            startTime: new Date(session.start_time),
            endTime: new Date(session.end_time),
            mentorEmail: mentor.email || '',
            userEmail: userProfile?.email || '',
            mentorName: mentor.full_name || 'Mentor',
            userName: userProfile?.full_name || 'Student',
          }
        )

        meetingLink = meetLink
        googleEventId = eventId

        logger.info('Google Calendar event created immediately', { sessionId, eventId, meetLink })
      } catch (calendarError: any) {
        logger.error('Failed to create Google Calendar event immediately', calendarError, { sessionId })
        // Continue without calendar event - don't fail the booking
      }
    } else {
      logger.warn('Mentor does not have Google Calendar connected', { mentorId: session.mentor_id })
    }

    // Update session with meeting link and calendar event ID immediately
    const { error: updateError } = await supabase
      .from('booked_sessions')
      .update({
        meeting_link: meetingLink,
        ...(googleEventId && { google_event_id: googleEventId }),
      })
      .eq('id', sessionId)

    if (updateError) {
      logger.error('Failed to update session with meeting link', updateError, { sessionId })
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      meetingLink,
      googleEventId,
    })
  } catch (error: any) {
    logger.error('Error generating meeting link', error, { 
      message: error.message,
      stack: error.stack,
      name: error.name 
    })
    // Return success even if meeting link generation fails - it will be retried in payment route
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to generate meeting link',
      meetingLink: null,
    }, { status: 200 }) // Return 200 so booking can continue
  }
}
