import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'
import { logger } from '@/lib/logger'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // If there's an OAuth error, redirect to login with error
  if (error) {
    return redirect(`/login?error=${encodeURIComponent(errorDescription || error)}`)
  }

  if (code) {
    const supabase = await createClient()
    const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!exchangeError && session) {
      // Check if this is a mentor and try to get Google OAuth tokens
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', session.user.id)
        .single()

      // If mentor, try to extract and store calendar tokens from the session
      // Note: Supabase stores provider tokens in session.provider_token and session.provider_refresh_token
      // but these may not always be available. We'll check the auth metadata instead.
      if (profile?.role === 'mentor') {
        try {
          // Get the full user object to check for provider tokens
          const { data: { user } } = await supabase.auth.getUser()
          
          if (user && user.app_metadata?.provider === 'google') {
            // Try to get tokens from the session
            // Note: provider_token and provider_refresh_token are available in the session object
            // but may need to be accessed differently depending on Supabase version
            const providerToken = (session as any).provider_token
            const providerRefreshToken = (session as any).provider_refresh_token

            if (providerToken || providerRefreshToken) {
              // Store Google Calendar tokens for the mentor
              await supabase
                .from('profiles')
                .update({
                  google_calendar_connected: true,
                  ...(providerToken && { google_calendar_access_token: providerToken }),
                  ...(providerRefreshToken && { google_calendar_refresh_token: providerRefreshToken }),
                  google_calendar_token_expires_at: session.expires_at 
                    ? new Date(session.expires_at * 1000).toISOString()
                    : new Date(Date.now() + 3600 * 1000).toISOString(), // Default 1 hour
                  google_calendar_id: 'primary', // Default to primary calendar
                })
                .eq('id', user.id)

              logger.info('Google Calendar tokens stored for mentor', { 
                userId: user.id,
                hasAccessToken: !!providerToken,
                hasRefreshToken: !!providerRefreshToken
              })
            } else {
              logger.warn('Google OAuth tokens not found in session', { userId: user.id })
            }
          }
        } catch (tokenError: any) {
          // Don't fail the login if token storage fails
          logger.error('Failed to store Google Calendar tokens', tokenError, { userId: session.user.id })
        }
      }

      // Session established successfully, redirect to dashboard
      return redirect(next)
    } else {
      // Exchange failed, redirect to login with error
      return redirect(`/login?error=${encodeURIComponent(exchangeError?.message || 'auth_failed')}`)
    }
  }

  // If there's no code, redirect to login
  return redirect('/login?error=no_auth_code')
}
