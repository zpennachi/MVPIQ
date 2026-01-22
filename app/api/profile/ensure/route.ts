import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { profileEnsureSchema } from '@/lib/validations'
import { handleApiError, ValidationError } from '@/lib/errors'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, email, firstName, lastName, role } = profileEnsureSchema.parse(body)

    // Use service role key to bypass RLS
    const supabaseAdmin = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Check if profile exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (existingProfile) {
      logger.debug('Profile already exists', { userId })
      return NextResponse.json({ success: true, message: 'Profile already exists' })
    }

    // Create profile
    const { error } = await supabaseAdmin.from('profiles').insert({
      id: userId,
      email,
      first_name: firstName || null,
      last_name: lastName || null,
      role: role || 'player',
    })

    if (error) {
      logger.error('Failed to create profile', error, { userId, email })
      throw new ValidationError('Failed to create profile', error)
    }

    logger.info('Profile created successfully', { userId, email, role })
    return NextResponse.json({ success: true, message: 'Profile created' })
  } catch (error) {
    return handleApiError(error)
  }
}
