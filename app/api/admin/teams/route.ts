import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/teams
 * Returns all teams for admin dashboard
 * Uses service role key to bypass RLS
 */
export async function GET(request: NextRequest) {
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

    const { data: teams, error, count } = await supabaseAdmin
      .from('teams')
      .select(`
        *,
        coach:profiles!teams_coach_id_fkey(*)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Error fetching teams for admin', error, { adminId: user.id })
      return NextResponse.json(
        { error: error.message || 'Failed to fetch teams' },
        { status: 500 }
      )
    }

    // Get member counts for each team
    const teamsWithCounts = await Promise.all(
      (teams || []).map(async (team) => {
        const { count: memberCount } = await supabaseAdmin
          .from('team_members')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', team.id)

        return {
          ...team,
          memberCount: memberCount || 0,
        }
      })
    )

    logger.info('Admin fetched all teams', { adminId: user.id, count: teamsWithCounts.length })

    return NextResponse.json({
      success: true,
      teams: teamsWithCounts || [],
      count: count || 0,
    })
  } catch (error: any) {
    logger.error('Exception in admin teams endpoint', error, {})
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
