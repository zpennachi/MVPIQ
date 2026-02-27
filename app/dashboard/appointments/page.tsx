import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MyAppointments } from '@/components/calendar/MyAppointments'

export const dynamic = 'force-dynamic'

export default async function AppointmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <MyAppointments userId={user.id} />
}
