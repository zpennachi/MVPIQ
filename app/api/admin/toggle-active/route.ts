import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/toggle-active
 * Toggle is_active status for a user
 * Uses service role key to bypass RLS
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userId, isActive } = await request.json()

    if (!userId || typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'userId and isActive are required' }, { status: 400 })
    }

    // Use service role key to bypass RLS
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

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', userId)

    if (error) {
      logger.error('Error toggling user active status', error, { adminId: user.id, userId })
      return NextResponse.json(
        { error: error.message || 'Failed to update user status' },
        { status: 500 }
      )
    }

    logger.info('User active status toggled', { adminId: user.id, userId, isActive })

    return NextResponse.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
    })
  } catch (error: any) {
    logger.error('Exception in toggle-active endpoint', error, {})
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
