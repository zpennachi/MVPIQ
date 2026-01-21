import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { google } from 'googleapis'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * GET /api/calendar/oauth/callback
 * Handles Google OAuth callback and stores tokens for calendar owner
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state') // User ID
    const error = searchParams.get('error')

    if (error) {
      logger.error('OAuth error in callback', { error })
      return NextResponse.redirect(new URL('/dashboard/settings?calendar_error=oauth_failed', request.url))
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/dashboard/settings?calendar_error=missing_params', request.url))
    }

    const supabase = await createClient()
    
    // Verify user is authenticated and matches state
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user || user.id !== state) {
      return NextResponse.redirect(new URL('/dashboard/settings?calendar_error=unauthorized', request.url))
    }

    // Check if user is mentor or admin (both can connect calendar)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'mentor' && profile.role !== 'admin')) {
      return NextResponse.redirect(new URL('/dashboard/settings?calendar_error=not_authorized', request.url))
    }

    // Get redirect URI
    const redirectUri = new URL('/api/calendar/oauth/callback', request.nextUrl.origin).toString()

    // Create OAuth2 client and exchange code for tokens
    const oauth2Client = new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      redirectUri
    )

    const { tokens } = await oauth2Client.getToken(code)
    
    if (!tokens.access_token || !tokens.refresh_token) {
      logger.error('OAuth tokens missing', { hasAccessToken: !!tokens.access_token, hasRefreshToken: !!tokens.refresh_token })
      return NextResponse.redirect(new URL('/dashboard/settings?calendar_error=no_tokens', request.url))
    }

    // Get calendar ID (primary calendar of the connected account)
    oauth2Client.setCredentials(tokens)
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    const calendarList = await calendar.calendarList.list()
    const primaryCalendar = calendarList.data.items?.find(cal => cal.primary) || calendarList.data.items?.[0]
    const calendarId = primaryCalendar?.id || 'primary'

    // Calculate token expiration (default to 1 hour if not provided)
    const expiresAt = tokens.expiry_date 
      ? new Date(tokens.expiry_date).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString()

    // Store tokens in database (update the user's profile - mentor or admin)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        google_calendar_connected: true,
        google_calendar_id: calendarId,
        google_calendar_access_token: tokens.access_token,
        google_calendar_refresh_token: tokens.refresh_token,
        google_calendar_token_expires_at: expiresAt,
      })
      .eq('id', user.id)

    if (updateError) {
      logger.error('Failed to store OAuth tokens', updateError)
      return NextResponse.redirect(new URL('/dashboard/settings?calendar_error=store_failed', request.url))
    }

    logger.info('Successfully stored Google Calendar OAuth tokens', { 
      userId: user.id, 
      calendarId,
      expiresAt 
    })

    // Redirect to dashboard (not settings) so they land on their dashboard after connecting
    return NextResponse.redirect(new URL('/dashboard?calendar_connected=success', request.url))
  } catch (error: any) {
    logger.error('Failed to handle OAuth callback', error)
    return NextResponse.redirect(new URL('/dashboard/settings?calendar_error=callback_failed', request.url))
  }
}
