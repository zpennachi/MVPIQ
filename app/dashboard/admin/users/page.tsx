import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UserManagement } from '@/components/admin/UserManagement'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
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

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard')
  }

  return <UserManagement adminId={user.id} />
}
