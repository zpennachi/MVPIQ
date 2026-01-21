import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUrl } from '@/lib/google-calendar'
import { env } from '@/lib/env'

export const dynamic = 'force-dynamic'

/**
 * GET /api/calendar/connect
 * Returns Google OAuth URL for mentor to connect their calendar
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a mentor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'mentor') {
      return NextResponse.json({ error: 'Only mentors can connect calendars' }, { status: 403 })
    }

    // Check if Google OAuth is configured
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
      return NextResponse.json(
        { error: 'Google Calendar integration is not configured' },
        { status: 500 }
      )
    }

    // Generate auth URL
    const authUrl = getAuthUrl({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      redirectUri: env.GOOGLE_REDIRECT_URI,
    })

    return NextResponse.json({ authUrl })
  } catch (error: any) {
    console.error('Error generating auth URL:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate auth URL' },
      { status: 500 }
    )
  }
}
