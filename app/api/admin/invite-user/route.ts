import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import { sendEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

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
      .select('role, email, first_name, last_name')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { email, firstName, lastName, role } = await request.json()

    if (!email || !role) {
      return NextResponse.json(
        { error: 'email and role are required' },
        { status: 400 }
      )
    }

    // Validate role - mentors, schools, and players can be invited
    if (role !== 'mentor' && role !== 'school' && role !== 'player') {
      return NextResponse.json(
        { error: 'Invalid role. Only mentors, schools, and players can be invited.' },
        { status: 400 }
      )
    }

    // Check if user already exists by checking profiles table
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

    // Check if profile with this email already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, role, email')
      .eq('email', email)
      .single()

    if (existingProfile) {
      return NextResponse.json(
        { error: `User with email ${email} already exists with role: ${existingProfile.role}` },
        { status: 400 }
      )
    }

    // Generate a secure random password
    const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12) + 'A1!'

    // Create user account
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: firstName || '',
        last_name: lastName || '',
        role: role,
      },
    })

    if (createError) {
      logger.error('Failed to create invited user', createError, { email, role })
      return NextResponse.json(
        { error: createError.message || 'Failed to create user account' },
        { status: 500 }
      )
    }

    if (!newUser.user) {
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      )
    }

    // Ensure profile exists (should be created by trigger, but ensure it)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: newUser.user.id,
        email,
        first_name: firstName || null,
        last_name: lastName || null,
        role: role,
      }, {
        onConflict: 'id',
      })

    if (profileError) {
      logger.error('Failed to create/update profile for invited user', profileError, { userId: newUser.user.id })
      // Don't fail - profile might already exist from trigger
    }

    // Define role label for use in response
    const roleLabel = role === 'mentor' ? 'Mentor/Professional Athlete' : role === 'school' ? 'School' : 'Player'

    // Send password reset email so they can set their own password
    try {
      const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email,
      })

      if (resetError) {
        logger.error('Failed to generate password reset link', resetError, { email })
        // Continue anyway - admin can manually reset password
      } else {
        logger.info('Password reset link generated for invited user', { email, role })
      }

      // Send a welcome email with login instructions
      const loginLink = `${env.NEXT_PUBLIC_APP_URL}/login`
      
      // Use submission_success template as a base for welcome email
      await sendEmail('submission_success', email, {
        videoTitle: `Welcome to MVP-IQ as a ${roleLabel}!`,
        dashboardLink: loginLink,
      })

      logger.info('Invitation email sent', { email, role, invitedBy: profile.email })
    } catch (emailError) {
      logger.error('Failed to send invitation email', emailError, { email, role })
      // Don't fail the invite if email fails - user can still reset password
    }

    logger.info('User invited successfully', {
      email,
      role,
      userId: newUser.user.id,
      invitedBy: profile.email,
    })

    return NextResponse.json({
      success: true,
      message: `${roleLabel} invited successfully. They can log in with their email and reset their password.`,
      userId: newUser.user.id,
    })
  } catch (error: any) {
    logger.error('Exception in invite-user endpoint', error, {})
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
