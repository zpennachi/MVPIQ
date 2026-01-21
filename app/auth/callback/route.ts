import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'
import { logger } from '@/lib/logger'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // If there's an OAuth error, redirect to login with error
  if (error) {
    return redirect(`/login?error=${encodeURIComponent(errorDescription || error)}`)
  }

  if (code) {
    const supabase = await createClient()
    const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!exchangeError && session) {

      // Session established successfully, redirect to dashboard
      return redirect(next)
    } else {
      // Exchange failed, redirect to login with error
      return redirect(`/login?error=${encodeURIComponent(exchangeError?.message || 'auth_failed')}`)
    }
  }

  // If there's no code, redirect to login
  return redirect('/login?error=no_auth_code')
}
