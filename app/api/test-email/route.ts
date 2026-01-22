import { NextRequest, NextResponse } from 'next/server'
import { sendGmailEmail } from '@/lib/gmail'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * GET /api/test-email
 * Quick test endpoint to send a test email via Gmail API
 * 
 * Query params:
 * - to: email address to send to (defaults to admin email)
 * - subject: custom subject (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Only allow authenticated users (for security)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - please log in first' },
        { status: 401 }
      )
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams
    const toEmail = searchParams.get('to')
    const customSubject = searchParams.get('subject')

    // Get admin email if no 'to' specified
    let recipientEmail: string | null = toEmail
    if (!recipientEmail) {
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('role', 'admin')
        .limit(1)
        .single()
      
      if (adminProfile?.email) {
        recipientEmail = adminProfile.email
      } else {
        return NextResponse.json(
          { 
            error: 'No recipient email specified and no admin email found',
            hint: 'Add ?to=your-email@example.com to the URL'
          },
          { status: 400 }
        )
      }
    }

    // TypeScript guard - recipientEmail should never be null here, but just in case
    if (!recipientEmail) {
      return NextResponse.json(
        { error: 'Recipient email is required' },
        { status: 400 }
      )
    }

    // Check if admin has OAuth tokens
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('id, email, google_calendar_connected, google_calendar_access_token, google_calendar_refresh_token')
      .eq('role', 'admin')

    const adminWithTokens = adminProfiles?.find(p => 
      p.google_calendar_access_token && 
      p.google_calendar_refresh_token
    )

    const testSubject = customSubject || '🧪 Gmail API Test - MVP-IQ'
    const testHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #1a1a1a; color: #fff;">
        <h2 style="color: #FFD700; margin-bottom: 20px;">✅ Gmail API Test Successful!</h2>
        <p>Hi there,</p>
        <p>This is a test email sent via the Gmail API integration.</p>
        <div style="background: #2a2a2a; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong style="color: #FFD700;">Sent from:</strong> mvpiqweb@gmail.com</p>
          <p style="margin: 5px 0;"><strong style="color: #FFD700;">Sent to:</strong> ${recipientEmail}</p>
          <p style="margin: 5px 0;"><strong style="color: #FFD700;">Timestamp:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <p>If you received this email, the Gmail API integration is working correctly! 🎉</p>
        <p style="color: #888; font-size: 12px; margin-top: 20px;">
          This is an automated test email from MVP-IQ.
        </p>
      </div>
    `

    logger.info('Sending test email', {
      to: recipientEmail,
      from: 'mvpiqweb@gmail.com',
      subject: testSubject,
    })

    // Send test email
    const result = await sendGmailEmail({
      from: 'mvpiqweb@gmail.com',
      to: recipientEmail,
      subject: testSubject,
      html: testHtml,
    })

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
        details: {
          recipient: recipientEmail,
          from: 'mvpiqweb@gmail.com',
          oAuthStatus: {
            hasAdminTokens: !!adminWithTokens,
            adminEmail: adminWithTokens?.email || 'Not found',
            adminId: adminWithTokens?.id || 'Not found',
            isConnected: adminWithTokens?.google_calendar_connected || false,
            hasAccessToken: !!adminWithTokens?.google_calendar_access_token,
            hasRefreshToken: !!adminWithTokens?.google_calendar_refresh_token,
          },
          troubleshooting: [
            '1. Make sure an admin account has connected their Google account',
            '2. Go to /dashboard/settings as an admin and click "Connect Google Calendar"',
            '3. Make sure Gmail scope is added in Google Cloud Console',
            '4. Check Vercel logs for detailed error messages',
          ],
        },
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully!',
      details: {
        recipient: recipientEmail,
        from: 'mvpweb@gmail.com',
        subject: testSubject,
        messageId: result.messageId,
        timestamp: new Date().toISOString(),
        oAuthStatus: {
          hasAdminTokens: !!adminWithTokens,
          adminEmail: adminWithTokens?.email || 'Not found',
          isConnected: adminWithTokens?.google_calendar_connected || false,
        },
      },
      note: 'Check your inbox (and spam folder) for the test email.',
    })
  } catch (error: any) {
    logger.error('Test email endpoint error', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Unknown error',
        details: error,
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/test-email
 * Alternative POST endpoint for testing
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { to, subject } = body

    // Build URL with query params
    const url = new URL('/api/test-email', request.nextUrl.origin)
    if (to) url.searchParams.set('to', to)
    if (subject) url.searchParams.set('subject', subject)

    // Redirect to GET endpoint
    return GET(new NextRequest(url.toString(), request))
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}
