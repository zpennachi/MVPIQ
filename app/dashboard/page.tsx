import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PlayerDashboard } from '@/components/dashboard/PlayerDashboard'
import { MentorDashboard } from '@/components/dashboard/MentorDashboard'
import { CoachDashboard } from '@/components/dashboard/CoachDashboard'
import { AdminDashboard } from '@/components/dashboard/AdminDashboard'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
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

  return (
    <>
      {profile.role === 'admin' ? (
        <AdminDashboard adminId={user.id} />
      ) : profile.role === 'player' ? (
        <PlayerDashboard userId={user.id} />
      ) : profile.role === 'coach' ? (
        <CoachDashboard coachId={user.id} />
      ) : (
        <MentorDashboard mentorId={user.id} />
      )}
    </>
  )
}
