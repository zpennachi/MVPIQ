import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { startOfDay, endOfDay, isSameDay } from 'date-fns'

// This endpoint should be called daily via cron job to send day-of reminders
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    // Simple auth check - in production, use a secure token
    if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'your-secret-key'}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const today = new Date()
    const todayStart = startOfDay(today).toISOString()
    const todayEnd = endOfDay(today).toISOString()

    // Get all sessions scheduled for today that are confirmed
    const { data: sessions, error } = await supabase
      .from('booked_sessions')
      .select(`
        *,
        mentor:profiles!booked_sessions_mentor_id_fkey(*),
        user:profiles!booked_sessions_user_id_fkey(*)
      `)
      .eq('status', 'confirmed')
      .gte('start_time', todayStart)
      .lte('start_time', todayEnd)

    if (error) {
      console.error('Error fetching sessions:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No sessions scheduled for today',
        count: 0 
      })
    }

    // Send reminders to both users and mentors
    const remindersSent = []
    for (const session of sessions) {
      const userEmail = (session as any).user?.email
      const mentorEmail = (session as any).mentor?.email
      function getFullName(profile: any): string {
        if (!profile) return ''
        const firstName = profile.first_name?.trim() || ''
        const lastName = profile.last_name?.trim() || ''
        if (firstName && lastName) return `${firstName} ${lastName}`
        if (firstName) return firstName
        if (lastName) return lastName
        return profile.email || ''
      }
      const mentorName = getFullName((session as any).mentor) || (session as any).mentor?.email

      // Send reminder to user
      if (userEmail) {
        try {
          await fetch(`${request.nextUrl.origin}/api/notifications/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'session_reminder',
              email: userEmail,
              data: {
                sessionId: session.id,
                mentorName: mentorName,
                startTime: session.start_time,
                meetingLink: session.meeting_link,
              },
            }),
          })
          remindersSent.push({ type: 'user', email: userEmail, sessionId: session.id })
        } catch (emailError) {
          console.error(`Failed to send reminder to user ${userEmail}:`, emailError)
        }
      }

      // Send reminder to mentor
      if (mentorEmail) {
        try {
          await fetch(`${request.nextUrl.origin}/api/notifications/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'session_reminder',
              email: mentorEmail,
              data: {
                sessionId: session.id,
                mentorName: mentorName,
                userName: getFullName((session as any).user) || (session as any).user?.email,
                startTime: session.start_time,
                meetingLink: session.meeting_link,
              },
            }),
          })
          remindersSent.push({ type: 'mentor', email: mentorEmail, sessionId: session.id })
        } catch (emailError) {
          console.error(`Failed to send reminder to mentor ${mentorEmail}:`, emailError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${remindersSent.length} reminders for ${sessions.length} sessions`,
      remindersSent,
      sessionsProcessed: sessions.length,
    })
  } catch (error: any) {
    console.error('Error in reminders cron:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
