import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BookSession } from '@/components/calendar/BookSession'
import { MyAppointments } from '@/components/calendar/MyAppointments'
import { MentorAvailability } from '@/components/calendar/MentorAvailability'

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

  // Mentors see availability management and upcoming meetings
  if (profile.role === 'mentor') {
    return (
      <div className="space-y-6">
        <div className="bg-black border border-[#272727] rounded-lg shadow-mvp p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">My Availability</h2>
          <MentorAvailability mentorId={user.id} />
        </div>
        <div className="bg-black border border-[#272727] rounded-lg shadow-mvp p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">Upcoming Meetings</h2>
          <MyAppointments userId={user.id} />
        </div>
      </div>
    )
  }

  // Players see booking interface and their appointments
  return (
    <div className="space-y-6">
      <BookSession userId={user.id} userRole={profile.role as any} />
      <MyAppointments userId={user.id} />
    </div>
  )
}
