import { NextRequest, NextResponse } from 'next/server'
import { createCalendarEvent } from '@/lib/google-calendar'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * GET /api/calendar/test
 * Test endpoint to verify Google Calendar service account is configured correctly
 */
export async function GET(request: NextRequest) {
  try {
    // Check if environment variables are set
    const hasEmail = !!env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    const hasKey = !!env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    const calendarId = env.GOOGLE_CALENDAR_ID || 'primary'

    if (!hasEmail || !hasKey) {
      return NextResponse.json({
        success: false,
        error: 'Service account not configured',
        details: {
          hasEmail,
          hasKey,
          emailValue: hasEmail ? env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.substring(0, 20) + '...' : 'NOT SET',
          keyLength: hasKey ? env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.length : 0,
        },
        message: 'Please set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY in Vercel environment variables',
      }, { status: 400 })
    }

    // Try to create a test event (1 hour from now)
    const testStartTime = new Date()
    testStartTime.setHours(testStartTime.getHours() + 1)
    const testEndTime = new Date(testStartTime)
    testEndTime.setHours(testEndTime.getHours() + 1)

    try {
      const result = await createCalendarEvent({
        summary: 'MVPIQ Service Account Test Event',
        description: 'This is a test event to verify the service account is working. You can delete this.',
        startTime: testStartTime,
        endTime: testEndTime,
        mentorEmail: env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'test@example.com',
        userEmail: 'test@example.com',
        mentorName: 'Test Mentor',
        userName: 'Test User',
      })

      // IMPORTANT: Service accounts cannot create Meet links on regular Gmail accounts
      // They require Google Workspace with domain-wide delegation
      const isGmailAccount = calendarId.includes('@gmail.com')
      const meetLinkIssue = !result.meetLink && isGmailAccount
        ? 'Service accounts cannot create Meet links on regular Gmail accounts. You need either: (1) Google Workspace account with domain-wide delegation, or (2) Use the calendar owner\'s OAuth token instead.'
        : !result.meetLink
        ? 'Meet link not generated. Check Vercel logs for details.'
        : null

      return NextResponse.json({
        success: true,
        message: result.meetLink 
          ? 'Service account is configured correctly and Meet link was generated!'
          : 'Service account is configured correctly, but Meet link was not generated.',
        details: {
          eventId: result.eventId,
          meetLink: result.meetLink || 'NOT GENERATED',
          calendarId,
          email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.substring(0, 30) + '...',
          isGmailAccount,
          limitation: meetLinkIssue,
        },
        note: result.meetLink 
          ? 'A test event was created in your calendar with a Meet link. You can delete it.'
          : meetLinkIssue || 'A test event was created but no Meet link was generated.',
        troubleshooting: !result.meetLink ? [
          '⚠️ IMPORTANT: Service accounts cannot create Meet links on regular Gmail accounts',
          '✅ Solution 1: Use Google Workspace account with domain-wide delegation (advanced)',
          '✅ Solution 2: Use calendar owner\'s OAuth token instead of service account (simpler)',
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
          calendarId,
          email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.substring(0, 30) + '...',
        },
        commonIssues: [
          'Service account email might be incorrect',
          'Private key might be malformed (check for proper BEGIN/END markers)',
          'Calendar might not be shared with the service account',
          'Google Calendar API might not be enabled',
          'Service account might not have proper permissions',
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
