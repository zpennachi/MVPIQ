import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/stats
 * Returns dashboard stats for admin
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

    // Total users
    const { count: totalUsers } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    // Active users (users with activity in last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { count: activeUsers } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('updated_at', thirtyDaysAgo.toISOString())

    // Total teams
    const { count: totalTeams } = await supabaseAdmin
      .from('teams')
      .select('*', { count: 'exact', head: true })

    // Total mentors
    const { count: totalMentors } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'mentor')

    // Total submissions
    const { count: totalSubmissions } = await supabaseAdmin
      .from('feedback_submissions')
      .select('*', { count: 'exact', head: true })

    // Total revenue (from payments)
    const { data: payments } = await supabaseAdmin
      .from('payments')
      .select('amount')
      .eq('status', 'succeeded')

    const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

    // Upcoming sessions
    const { count: upcomingSessions } = await supabaseAdmin
      .from('booked_sessions')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'confirmed'])
      .gte('start_time', new Date().toISOString())

    const stats = {
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      totalTeams: totalTeams || 0,
      totalMentors: totalMentors || 0,
      totalSubmissions: totalSubmissions || 0,
      totalRevenue: totalRevenue / 100, // Convert cents to dollars
      upcomingSessions: upcomingSessions || 0,
    }

    logger.info('Admin fetched dashboard stats', { adminId: user.id, stats })

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error: any) {
    logger.error('Exception in admin stats endpoint', error, {})
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
