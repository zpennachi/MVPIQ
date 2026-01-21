import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PlayerFeedbackPage } from '@/components/dashboard/PlayerFeedbackPage'
import { MentorFeedbackPage } from '@/components/dashboard/MentorFeedbackPage'

export const dynamic = 'force-dynamic'

export default async function FeedbackPage() {
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

  if (profile.role === 'mentor') {
    return <MentorFeedbackPage mentorId={user.id} />
  }

  return <PlayerFeedbackPage userId={user.id} />
}
