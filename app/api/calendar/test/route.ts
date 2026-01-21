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
        mentorEmail: 'test@example.com',
        userEmail: 'test@example.com',
        mentorName: 'Test Mentor',
        userName: 'Test User',
      })

      return NextResponse.json({
        success: true,
        message: 'Service account is configured correctly!',
        details: {
          eventId: result.eventId,
          meetLink: result.meetLink,
          calendarId,
          email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.substring(0, 30) + '...',
        },
        note: 'A test event was created in your calendar. You can delete it.',
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
