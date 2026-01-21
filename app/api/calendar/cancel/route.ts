import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deleteCalendarEvent } from '@/lib/google-calendar'

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

    // If session has a Google Calendar event, delete it using OAuth
    if (session.google_event_id) {
      try {
        await deleteCalendarEvent(session.google_event_id)
        console.log('✅ Deleted Google Calendar event:', session.google_event_id)
      } catch (error: any) {
        console.error('❌ Error deleting Google Calendar event:', error)
        // Log the error but don't fail the cancellation
        console.error('Error details:', {
          message: error.message,
          eventId: session.google_event_id,
        })
      }
    }

    // Update session status in database
    const { error: updateError } = await supabase
      .from('booked_sessions')
      .update({ status: 'cancelled' })
      .eq('id', sessionId)

    if (updateError) {
      console.error('Error updating session status:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    console.log('✅ Session cancelled successfully:', sessionId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error cancelling session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to cancel session' },
      { status: 500 }
    )
  }
}
