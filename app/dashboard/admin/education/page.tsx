import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EducationManagement } from '@/components/admin/EducationManagement'

export const dynamic = 'force-dynamic'

export default async function AdminEducationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard')
  }

  return <EducationManagement adminId={user.id} />
}
