import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Grant a session credit to a user
 * Called when a mentor cancels a session
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, sourceSessionId, reason } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
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

    // Only mentors and admins can grant credits (when cancelling)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'mentor' && profile.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Only mentors and admins can grant credits' },
        { status: 403 }
      )
    }

    // Grant credit
    console.log(`💰 Granting credit to user ${userId} for cancelled session ${sourceSessionId}`)
    const { data: credit, error: creditError } = await supabase
      .from('session_credits')
      .insert({
        user_id: userId,
        source_session_id: sourceSessionId || null,
        reason: reason || 'mentor_cancellation',
      })
      .select()
      .single()

    if (creditError) {
      console.error('❌ Error granting credit:', creditError)
      // If table doesn't exist, provide helpful error message
      if (creditError.message?.includes('does not exist') || creditError.code === '42P01') {
        return NextResponse.json(
          { 
            error: 'Credits table does not exist', 
            details: 'Please run the SQL migration: supabase/session-credits-schema.sql',
            migrationFile: 'supabase/session-credits-schema.sql'
          },
          { status: 500 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to grant credit', details: creditError.message },
        { status: 500 }
      )
    }

    console.log(`✅ Credit granted successfully:`, credit)

    return NextResponse.json({
      success: true,
      credit: credit,
    })
  } catch (error: any) {
    console.error('Error in grant credit:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
