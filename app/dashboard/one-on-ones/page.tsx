import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OneOnOnesClient } from './OneOnOnesClient'

export const dynamic = 'force-dynamic'

export default async function OneOnOnesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  return <OneOnOnesClient userId={user.id} userRole={profile.role as any} />
}
