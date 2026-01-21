import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { HomepageEditor } from '@/components/admin/HomepageEditor'

export const dynamic = 'force-dynamic'

export default async function HomepageEditorPage() {
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

  return (
    <div className="space-y-6">
      <HomepageEditor />
    </div>
  )
}
