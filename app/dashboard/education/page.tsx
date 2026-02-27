import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EducationSection } from '@/components/education/EducationSection'

export const dynamic = 'force-dynamic'

export default async function EducationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <EducationSection />
}
