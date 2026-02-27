import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * PUT /api/admin/education-videos/[id]
 * Updates an education video
 * Uses service role key to bypass RLS
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      .update({
        title,
        description: description || null,
        video_url,
        position: position || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      logger.error('Error updating education video', error, { adminId: user.id, videoId: params.id })
      return NextResponse.json(
        { error: error.message || 'Failed to update video' },
        { status: 500 }
      )
    }

    logger.info('Admin updated education video', { adminId: user.id, videoId: params.id })

    return NextResponse.json({
      success: true,
      video,
    })
  } catch (error: any) {
    logger.error('Exception in update education video endpoint', error, {})
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/education-videos/[id]
 * Deletes an education video
 * Uses service role key to bypass RLS
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { error } = await supabaseAdmin
      .from('education_videos')
      .delete()
      .eq('id', params.id)

    if (error) {
      logger.error('Error deleting education video', error, { adminId: user.id, videoId: params.id })
      return NextResponse.json(
        { error: error.message || 'Failed to delete video' },
        { status: 500 }
      )
    }

    logger.info('Admin deleted education video', { adminId: user.id, videoId: params.id })

    return NextResponse.json({
      success: true,
      message: 'Video deleted successfully',
    })
  } catch (error: any) {
    logger.error('Exception in delete education video endpoint', error, {})
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
