import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/delete-user
 * Permanently delete a user account
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

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Prevent admins from deleting themselves
    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    // Use service role client to delete profile first (bypasses RLS)
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

    // Step 1: Delete the profile first (this will cascade to related data)
    const { error: profileDeleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileDeleteError) {
      logger.error('Error deleting profile', profileDeleteError, { adminId: user.id, userId })
      return NextResponse.json(
        { error: `Failed to delete profile: ${profileDeleteError.message}` },
        { status: 500 }
      )
    }

    // Step 2: Delete user from auth (now that profile is gone, FK constraint won't block it)
    const deleteUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${userId}`
    const deleteResponse = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      },
    })

    if (!deleteResponse.ok) {
      let errorMessage = 'Failed to delete user'
      try {
        const errorData = await deleteResponse.json()
        errorMessage = errorData.message || errorData.error_description || errorMessage
      } catch {
        // If response isn't JSON, use status text
        errorMessage = deleteResponse.statusText || `Failed to delete user (${deleteResponse.status})`
      }
      
      logger.error('Error deleting user from auth', { 
        adminId: user.id, 
        userId, 
        status: deleteResponse.status,
        statusText: deleteResponse.statusText 
      })
      
      return NextResponse.json(
        { error: errorMessage },
        { status: deleteResponse.status || 500 }
      )
    }

    logger.info('User deleted', { adminId: user.id, userId })

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    })
  } catch (error: any) {
    logger.error('Exception in delete-user endpoint', error, {})
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
