import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { google } from 'googleapis'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * POST /api/calendar/oauth/refresh
 * Refreshes OAuth tokens for the current user (admin or mentor)
 * Called automatically on login to ensure tokens are fresh
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is mentor or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, google_calendar_refresh_token, google_calendar_access_token')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'mentor' && profile.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Only mentors and admins can refresh OAuth tokens' },
        { status: 403 }
      )
    }

    // If no refresh token exists, can't refresh
    if (!profile.google_calendar_refresh_token) {
      return NextResponse.json({
        success: false,
        message: 'No OAuth tokens found. Please connect Google Calendar first.',
      })
    }

    // Use service role to update tokens (bypass RLS)
    const supabaseAdmin = createAdminClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Refresh the token
    const oauth2Client = new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      '' // Redirect URI not needed for refresh
    )

    oauth2Client.setCredentials({
      refresh_token: profile.google_calendar_refresh_token,
    })

    try {
      const { credentials } = await oauth2Client.refreshAccessToken()

      if (!credentials.access_token) {
        logger.warn('Failed to refresh OAuth token - no access_token in response', {
          userId: user.id,
        })
        return NextResponse.json({
          success: false,
          message: 'Failed to refresh token. Please reconnect Google Calendar.',
        })
      }

      // Calculate new expiration
      const newExpiresAt = credentials.expiry_date
        ? new Date(credentials.expiry_date).toISOString()
        : new Date(Date.now() + 3600 * 1000).toISOString()

      // Update tokens in database
      const updateData: any = {
        google_calendar_access_token: credentials.access_token,
        google_calendar_token_expires_at: newExpiresAt,
        google_calendar_connected: true, // Ensure this is set
      }

      // Update refresh token if Google provided a new one
      if (credentials.refresh_token && credentials.refresh_token !== profile.google_calendar_refresh_token) {
        logger.info('Google provided new refresh token', { userId: user.id })
        updateData.google_calendar_refresh_token = credentials.refresh_token
      }

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)

      if (updateError) {
        logger.error('Failed to update refreshed OAuth token', updateError, { userId: user.id })
        return NextResponse.json({
          success: false,
          message: 'Failed to save refreshed token.',
        })
      }

      logger.info('✅ OAuth token refreshed successfully on login', {
        userId: user.id,
        role: profile.role,
        newExpiresAt,
      })

      return NextResponse.json({
        success: true,
        message: 'OAuth tokens refreshed successfully',
        expiresAt: newExpiresAt,
      })
    } catch (refreshError: any) {
      logger.error('Exception during OAuth token refresh', refreshError, {
        userId: user.id,
        errorMessage: refreshError?.message,
      })
      
      // If refresh fails, tokens might be invalid - user needs to reconnect
      return NextResponse.json({
        success: false,
        message: 'Token refresh failed. Please reconnect Google Calendar in settings.',
      })
    }
  } catch (error: any) {
    logger.error('Failed to refresh OAuth tokens', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
