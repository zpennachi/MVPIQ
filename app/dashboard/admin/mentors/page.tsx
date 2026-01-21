import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MentorManagement } from '@/components/admin/MentorManagement'

export const dynamic = 'force-dynamic'

export default async function AdminMentorsPage() {
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

  return <MentorManagement adminId={user.id} />
}
