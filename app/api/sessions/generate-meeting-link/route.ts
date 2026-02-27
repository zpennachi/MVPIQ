import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCalendarEvent } from '@/lib/google-calendar'
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

    // Get mentor and user profiles
    const [mentorResult, userResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', session.mentor_id)
        .single(),
      supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', session.user_id)
        .single(),
    ])

    if (mentorResult.error || !mentorResult.data) {
      logger.error('Mentor not found', mentorResult.error, { mentorId: session.mentor_id })
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 })
    }

    if (userResult.error || !userResult.data) {
      logger.error('User not found', userResult.error, { userId: session.user_id })
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const mentor = mentorResult.data
    const userProfile = userResult.data

    // Generate Google Calendar event with Meet link using OAuth
    let meetingLink: string | null = null
    let googleEventId: string | undefined = undefined

    // Helper to get full name from first_name and last_name
    function getFullName(profile: any): string {
      if (!profile) return ''
      const firstName = profile.first_name?.trim() || ''
      const lastName = profile.last_name?.trim() || ''
      if (firstName && lastName) return `${firstName} ${lastName}`
      if (firstName) return firstName
      if (lastName) return lastName
      return profile.email || ''
    }

    const userFullName = getFullName(userProfile) || 'Student'
    const mentorFullName = getFullName(mentor) || 'Mentor'

    try {
      const { eventId, meetLink } = await createCalendarEvent({
        summary: `1-on-1 Session: ${userFullName} with ${mentorFullName}`,
        description: `Scheduled mentoring session via MVP-IQ`,
        startTime: new Date(session.start_time),
        endTime: new Date(session.end_time),
        mentorEmail: mentor.email || '',
        userEmail: userProfile.email || '',
        mentorName: mentorFullName,
        userName: userFullName,
        mentorId: session.mentor_id, // Use mentor's OAuth tokens
      })

      meetingLink = meetLink
      googleEventId = eventId

      logger.info('Google Calendar event created immediately', { 
        sessionId, 
        eventId, 
        meetLink,
        hasMeetLink: !!meetLink,
      })
    } catch (calendarError: any) {
      // Log detailed error for debugging
      const errorMessage = calendarError?.message || 'Unknown error'
      logger.error('Failed to create Google Calendar event immediately', calendarError, { 
        sessionId,
        errorMessage,
        errorCode: calendarError?.code,
        errorStack: calendarError?.stack,
        hint: errorMessage.includes('not configured') 
          ? 'Google OAuth not configured. See GOOGLE_CALENDAR_SETUP.md'
          : errorMessage.includes('OAuth') 
          ? 'OAuth tokens may be invalid or expired. Try reconnecting calendar in settings.'
          : 'Check OAuth tokens and calendar permissions'
      })
      // Continue without calendar event - don't fail the booking
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
