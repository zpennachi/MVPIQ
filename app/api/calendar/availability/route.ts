import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAvailableSlots, refreshAccessToken } from '@/lib/google-calendar'
import { env } from '@/lib/env'

export const dynamic = 'force-dynamic'

/**
 * GET /api/calendar/availability
 * Get available time slots for a mentor using Google Calendar Free/Busy API
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const mentorId = request.nextUrl.searchParams.get('mentorId')
    const startDate = request.nextUrl.searchParams.get('startDate')
    const endDate = request.nextUrl.searchParams.get('endDate')
    const duration = parseInt(request.nextUrl.searchParams.get('duration') || '60')

    if (!mentorId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'mentorId, startDate, and endDate are required' },
        { status: 400 }
      )
    }

    // Get mentor's Google Calendar connection
    const { data: mentor } = await supabase
      .from('profiles')
      .select('id, email, full_name, google_calendar_id, google_calendar_access_token, google_calendar_refresh_token, google_calendar_connected')
      .eq('id', mentorId)
      .single()

    if (!mentor) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 })
    }

    // Check if mentor has Google Calendar connected
    if (!mentor.google_calendar_connected || !mentor.google_calendar_access_token || !mentor.google_calendar_id) {
      // Fallback: Return empty slots (frontend can use old availability_slots system)
      return NextResponse.json({ availableSlots: [] })
    }

    let accessToken = mentor.google_calendar_access_token

    // Try to refresh token if needed
    try {
      if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && mentor.google_calendar_refresh_token) {
        accessToken = await refreshAccessToken(
          {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            redirectUri: env.GOOGLE_REDIRECT_URI || '',
          },
          mentor.google_calendar_refresh_token
        )

        // Update stored access token
        await supabase
          .from('profiles')
          .update({ google_calendar_access_token: accessToken })
          .eq('id', mentorId)
      }
    } catch (refreshError) {
      console.error('Error refreshing token:', refreshError)
      // Continue with existing token
    }

    // Get available slots from Google Calendar
    const availableSlots = await getAvailableSlots(
      accessToken,
      mentor.google_calendar_id,
      new Date(startDate),
      new Date(endDate),
      duration
    )

    // Filter out slots that are already booked in our system
    const { data: existingBookings } = await supabase
      .from('booked_sessions')
      .select('start_time, end_time')
      .eq('mentor_id', mentorId)
      .in('status', ['pending', 'confirmed'])
      .gte('start_time', startDate)
      .lt('start_time', endDate)

    // Filter out conflicting slots
    const filteredSlots = availableSlots.filter(slot => {
      return !existingBookings?.some(booking => {
        const bookingStart = new Date(booking.start_time)
        const bookingEnd = new Date(booking.end_time)
        return (
          (slot.start >= bookingStart && slot.start < bookingEnd) ||
          (slot.end > bookingStart && slot.end <= bookingEnd) ||
          (slot.start <= bookingStart && slot.end >= bookingEnd)
        )
      })
    })

    return NextResponse.json({
      availableSlots: filteredSlots.map(slot => ({
        start_time: slot.start.toISOString(),
        end_time: slot.end.toISOString(),
      })),
    })
  } catch (error: any) {
    console.error('Error getting availability:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get availability' },
      { status: 500 }
    )
  }
}
