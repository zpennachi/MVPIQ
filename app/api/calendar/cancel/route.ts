import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deleteCalendarEvent, refreshAccessToken } from '@/lib/google-calendar'
import { env } from '@/lib/env'

export const dynamic = 'force-dynamic'

/**
 * POST /api/calendar/cancel
 * Cancel a session and delete the Google Calendar event
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get session details
    const { data: session } = await supabase
      .from('booked_sessions')
      .select('*, mentor:profiles!booked_sessions_mentor_id_fkey(*)')
      .eq('id', sessionId)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const mentor = (session as any).mentor

    // Check if user is mentor or the user who booked
    if (session.mentor_id !== user.id && session.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // If session has a Google Calendar event, delete it
    if (session.google_event_id && mentor?.google_calendar_connected && mentor.google_calendar_id && mentor.google_calendar_access_token) {
      try {
        let accessToken = mentor.google_calendar_access_token

        // Try to refresh token if needed
        if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && mentor.google_calendar_refresh_token) {
          try {
            accessToken = await refreshAccessToken(
              {
                clientId: env.GOOGLE_CLIENT_ID,
                clientSecret: env.GOOGLE_CLIENT_SECRET,
                redirectUri: env.GOOGLE_REDIRECT_URI || '',
              },
              mentor.google_calendar_refresh_token
            )

            // Update stored token
            await supabase
              .from('profiles')
              .update({ google_calendar_access_token: accessToken })
              .eq('id', mentor.id)
          } catch (refreshError) {
            console.error('Error refreshing token:', refreshError)
          }
        }

        // Delete Google Calendar event
        await deleteCalendarEvent(
          accessToken,
          mentor.google_calendar_id,
          session.google_event_id
        )

        console.log('✅ Deleted Google Calendar event:', session.google_event_id)
      } catch (error) {
        console.error('❌ Error deleting Google Calendar event:', error)
        // Don't fail the cancellation if Google Calendar deletion fails
      }
    }

    // Update session status in database
    const { error: updateError } = await supabase
      .from('booked_sessions')
      .update({ status: 'cancelled' })
      .eq('id', sessionId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error cancelling session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to cancel session' },
      { status: 500 }
    )
  }
}
