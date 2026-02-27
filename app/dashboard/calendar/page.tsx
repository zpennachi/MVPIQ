import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BookSession } from '@/components/calendar/BookSession'
import { MentorAvailability } from '@/components/calendar/MentorAvailability'

export const dynamic = 'force-dynamic'

export default async function CalendarPage() {
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

  // Mentors see their availability management
  if (profile.role === 'mentor') {
    return <MentorAvailability mentorId={user.id} />
  }

  // Players and coaches see booking interface
  return <BookSession userId={user.id} userRole={profile.role as any} />
}
