import { NextRequest, NextResponse } from 'next/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens, getPrimaryCalendarId } from '@/lib/google-calendar'
import { env } from '@/lib/env'

export const dynamic = 'force-dynamic'

/**
 * GET /api/calendar/callback
 * Handles Google OAuth callback and stores tokens
 */
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code')
    const error = request.nextUrl.searchParams.get('error')
    
    if (error) {
      console.error('OAuth error:', error)
      return redirect('/dashboard/settings?calendar_error=access_denied')
    }

    if (!code) {
      return redirect('/dashboard/settings?calendar_error=no_code')
    }

    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
      return redirect('/dashboard/settings?calendar_error=not_configured')
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return redirect('/login')
    }

    // Check if user is a mentor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'mentor') {
      return redirect('/dashboard?calendar_error=unauthorized')
    }

    // Exchange code for tokens
    const { accessToken, refreshToken } = await exchangeCodeForTokens(
      {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        redirectUri: env.GOOGLE_REDIRECT_URI,
      },
      code
    )

    // Get primary calendar ID
    const calendarId = await getPrimaryCalendarId(accessToken)

    // Store tokens and calendar ID in database
    // We'll add a table for this, or store in profiles
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        google_calendar_id: calendarId,
        google_calendar_access_token: accessToken, // Encrypt in production!
        google_calendar_refresh_token: refreshToken, // Encrypt in production!
        google_calendar_connected: true,
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error storing calendar tokens:', updateError)
      return redirect('/dashboard/settings?calendar_error=storage_failed')
    }

    return redirect('/dashboard/settings?calendar_connected=true')
  } catch (error: any) {
    console.error('Error in OAuth callback:', error)
    return redirect(`/dashboard/settings?calendar_error=${encodeURIComponent(error.message)}`)
  }
}
