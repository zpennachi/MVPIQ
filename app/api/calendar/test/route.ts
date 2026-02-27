import { NextRequest, NextResponse } from 'next/server'
import { createCalendarEvent } from '@/lib/google-calendar'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/calendar/test
 * Test endpoint to verify Google Calendar OAuth is configured correctly
 */
export async function GET(request: NextRequest) {
  try {
    // Check if OAuth environment variables are set
    const hasOAuthEnv = !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)

    if (!hasOAuthEnv) {
      return NextResponse.json({
        success: false,
        error: 'OAuth not configured',
        details: {
          hasClientId: !!env.GOOGLE_CLIENT_ID,
          hasClientSecret: !!env.GOOGLE_CLIENT_SECRET,
        },
        message: 'Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel environment variables, then connect Google Calendar in settings.',
      }, { status: 400 })
    }

    // Check OAuth status - check all admins, not just those with connected=true
    const supabase = await createClient()
    const { data: adminProfiles, error: adminError } = await supabase
      .from('profiles')
      .select('id, email, google_calendar_connected, google_calendar_id, google_calendar_access_token, google_calendar_refresh_token, google_calendar_token_expires_at')
      .eq('role', 'admin')
    
    // Find the first admin with tokens (prioritize connected=true, but also check if tokens exist)
    const adminProfile = adminProfiles?.find(p => 
      p.google_calendar_access_token && 
      p.google_calendar_refresh_token
    ) || null

    const hasOAuth = !!adminProfile && !!adminProfile.google_calendar_access_token && !!adminProfile.google_calendar_refresh_token
    
    // Log diagnostic info
    logger.info('OAuth status check', {
      adminCount: adminProfiles?.length || 0,
      adminError: adminError?.message,
      foundAdminWithTokens: !!adminProfile,
      adminEmail: adminProfile?.email,
      adminId: adminProfile?.id,
      connected: adminProfile?.google_calendar_connected,
      hasAccessToken: !!adminProfile?.google_calendar_access_token,
      hasRefreshToken: !!adminProfile?.google_calendar_refresh_token,
      accessTokenLength: adminProfile?.google_calendar_access_token?.length || 0,
      refreshTokenLength: adminProfile?.google_calendar_refresh_token?.length || 0,
      expiresAt: adminProfile?.google_calendar_token_expires_at,
      allAdmins: adminProfiles?.map(p => ({
        email: p.email,
        id: p.id,
        connected: p.google_calendar_connected,
        hasAccessToken: !!p.google_calendar_access_token,
        hasRefreshToken: !!p.google_calendar_refresh_token,
        accessTokenLength: p.google_calendar_access_token?.length || 0,
        refreshTokenLength: p.google_calendar_refresh_token?.length || 0,
      })),
    })

    // Try to create a test event (1 hour from now)
    const testStartTime = new Date()
    testStartTime.setHours(testStartTime.getHours() + 1)
    const testEndTime = new Date(testStartTime)
    testEndTime.setHours(testEndTime.getHours() + 1)

    if (!hasOAuth) {
      return NextResponse.json({
        success: false,
        error: 'OAuth not connected',
        details: {
          hasOAuthEnv,
          totalAdmins: adminProfiles?.length || 0,
          adminsWithTokens: adminProfiles?.filter(p => p.google_calendar_access_token && p.google_calendar_refresh_token).length || 0,
        },
        message: 'OAuth environment variables are set, but no admin has connected their Google Calendar. Please go to /dashboard/settings and connect Google Calendar.',
        troubleshooting: [
          '1. Make sure you have an admin account (check totalAdmins above)',
          '2. Go to /dashboard/settings as an admin user',
          '3. Click "Connect Google Calendar"',
          '4. Complete the OAuth flow',
          '5. Run this test again',
        ],
      }, { status: 400 })
    }

    try {
      const result = await createCalendarEvent({
        summary: 'MVPIQ OAuth Test Event',
        description: 'This is a test event to verify OAuth is working. You can delete this.',
        startTime: testStartTime,
        endTime: testEndTime,
        mentorEmail: adminProfile?.email || 'test@example.com',
        userEmail: 'test@example.com',
        mentorName: 'Test Mentor',
        userName: 'Test User',
      })

      return NextResponse.json({
        success: true,
        message: result.meetLink 
          ? 'OAuth is configured correctly and Meet link was generated!'
          : 'OAuth is configured but Meet link was not generated. Check Vercel logs for details.',
        details: {
          eventId: result.eventId,
          meetLink: result.meetLink || 'NOT GENERATED',
          calendarId: adminProfile?.google_calendar_id || 'primary',
          email: adminProfile?.email,
          authMethod: 'OAuth',
          oAuthStatus: {
            connected: !!adminProfile?.google_calendar_connected,
            hasAccessToken: !!adminProfile?.google_calendar_access_token,
            hasRefreshToken: !!adminProfile?.google_calendar_refresh_token,
            hasTokens: hasOAuth,
            hasEnvVars: hasOAuthEnv,
            adminEmail: adminProfile?.email,
            adminId: adminProfile?.id,
            calendarId: adminProfile?.google_calendar_id,
            expiresAt: adminProfile?.google_calendar_token_expires_at,
            totalAdmins: adminProfiles?.length || 0,
            adminsWithTokens: adminProfiles?.filter(p => p.google_calendar_access_token && p.google_calendar_refresh_token).length || 0,
          },
        },
        note: result.meetLink 
          ? 'A test event was created in your calendar with a Meet link. You can delete it.'
          : 'A test event was created but no Meet link was generated. Check Vercel logs for details.',
        troubleshooting: !result.meetLink ? [
          '⚠️ Meet link not generated - possible causes:',
          '1. Calendar owner may not have Google Meet enabled/licensed',
          '2. Calendar may not support Google Meet',
          '3. OAuth token may not have sufficient permissions',
          '4. Meet link creation may be asynchronous - try fetching event again later',
          '📖 See HOW_TO_CHECK_VERCEL_LOGS.md for how to view detailed error logs',
        ] : undefined,
      })
    } catch (createError: any) {
      logger.error('Failed to create test calendar event', createError)
      
      return NextResponse.json({
        success: false,
        error: 'Failed to create calendar event',
        details: {
          message: createError?.message || 'Unknown error',
          code: createError?.code,
          adminEmail: adminProfile?.email,
          calendarId: adminProfile?.google_calendar_id,
        },
        commonIssues: [
          'OAuth tokens may be expired or invalid - try reconnecting in settings',
          'Google Calendar API may not be enabled',
          'OAuth token may not have sufficient permissions',
          'Calendar may not be accessible',
        ],
      }, { status: 500 })
    }
  } catch (error: any) {
    logger.error('Error in calendar test endpoint', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      details: error,
    }, { status: 500 })
  }
}
