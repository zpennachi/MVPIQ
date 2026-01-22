import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { google } from 'googleapis'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * GET /api/calendar/oauth/connect
 * Initiates Google OAuth flow for calendar owner to connect their Google account
 * This allows Meet links to be generated via OAuth
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is mentor or admin (both can connect calendar)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'mentor' && profile.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Only mentors and admins can connect calendar' },
        { status: 403 }
      )
    }

    // Check if Google OAuth credentials are configured
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      logger.error('Google OAuth credentials not configured', undefined, {
        hasClientId: !!env.GOOGLE_CLIENT_ID,
        hasClientSecret: !!env.GOOGLE_CLIENT_SECRET,
      })
      return NextResponse.json(
        { 
          error: 'Google OAuth is not configured',
          details: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in environment variables',
          hint: 'Add these to your .env file or Vercel environment variables',
        },
        { status: 500 }
      )
    }

    // Get the redirect URL from query params or use default
    const redirectUri = new URL('/api/calendar/oauth/callback', request.nextUrl.origin).toString()

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      redirectUri
    )

    // Generate auth URL with calendar and Gmail scopes
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent', // Force consent to get refresh token
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/gmail.send', // Gmail send permission
      ],
      state: user.id, // Pass user ID in state to verify on callback
    })

    logger.info('Generated Google Calendar OAuth URL', { userId: user.id })

    return NextResponse.json({
      authUrl,
      message: 'Redirect user to this URL to connect their Google Calendar',
    })
  } catch (error: any) {
    logger.error('Failed to generate OAuth URL', error)
    return NextResponse.json(
      { error: 'Failed to generate OAuth URL', details: error.message },
      { status: 500 }
    )
  }
}
