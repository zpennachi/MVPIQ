import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Check available credits for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get available (unused, not expired) credits
    const { data: credits, error: creditsError } = await supabase
      .from('session_credits')
      .select('*')
      .eq('user_id', user.id)
      .eq('used', false)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
      .order('created_at', { ascending: true })

    if (creditsError) {
      console.error('❌ Error fetching credits:', creditsError)
      // If table doesn't exist, return 0 credits instead of error
      if (creditsError.message?.includes('does not exist') || creditsError.code === '42P01') {
        console.warn('⚠️ session_credits table does not exist. Please run the SQL migration.')
        return NextResponse.json({
          availableCredits: 0,
          credits: [],
          warning: 'Credits table not found. Please run the SQL migration.',
        })
      }
      return NextResponse.json(
        { error: 'Failed to fetch credits', details: creditsError.message },
        { status: 500 }
      )
    }

    console.log(`✅ Found ${credits?.length || 0} available credits for user ${user.id}`)

    return NextResponse.json({
      availableCredits: credits?.length || 0,
      credits: credits || [],
    })
  } catch (error: any) {
    console.error('Error checking credits:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
