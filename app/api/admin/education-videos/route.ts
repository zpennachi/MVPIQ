import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/education-videos
 * Returns all education videos for admin management
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

    const { data: videos, error } = await supabaseAdmin
      .from('education_videos')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Error fetching education videos', error, { adminId: user.id })
      return NextResponse.json(
        { error: error.message || 'Failed to fetch videos' },
        { status: 500 }
      )
    }

    logger.info('Admin fetched education videos', { adminId: user.id, count: videos?.length || 0 })

    return NextResponse.json({
      success: true,
      videos: videos || [],
    })
  } catch (error: any) {
    logger.error('Exception in admin education-videos endpoint', error, {})
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/education-videos
 * Creates a new education video
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

    const { title, description, video_url, position } = await request.json()

    if (!title || !video_url) {
      return NextResponse.json(
        { error: 'title and video_url are required' },
        { status: 400 }
      )
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

    const { data: video, error } = await supabaseAdmin
      .from('education_videos')
      .insert({
        title,
        description: description || null,
        video_url,
        position: position || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating education video', error, { adminId: user.id })
      return NextResponse.json(
        { error: error.message || 'Failed to create video' },
        { status: 500 }
      )
    }

    logger.info('Admin created education video', { adminId: user.id, videoId: video.id })

    return NextResponse.json({
      success: true,
      video,
    })
  } catch (error: any) {
    logger.error('Exception in create education video endpoint', error, {})
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
