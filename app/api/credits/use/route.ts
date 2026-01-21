import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Use a credit for a session booking
 * Marks the credit as used and links it to the session
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('booked_sessions')
      .select('user_id, status')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    if (session.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Find an available credit
    const { data: credits, error: creditsError } = await supabase
      .from('session_credits')
      .select('*')
      .eq('user_id', user.id)
      .eq('used', false)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(1)

    if (creditsError || !credits || credits.length === 0) {
      return NextResponse.json(
        { error: 'No available credits' },
        { status: 400 }
      )
    }

    const credit = credits[0]

    // Mark credit as used
    const { error: updateError } = await supabase
      .from('session_credits')
      .update({
        used: true,
        used_for_session_id: sessionId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', credit.id)

    if (updateError) {
      console.error('Error using credit:', updateError)
      return NextResponse.json(
        { error: 'Failed to use credit', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      creditId: credit.id,
      message: 'Credit applied successfully',
    })
  } catch (error: any) {
    console.error('Error using credit:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
