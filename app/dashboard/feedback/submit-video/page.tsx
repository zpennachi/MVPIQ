'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { VideoURLSubmission } from '@/components/video/VideoURLSubmission'
import { useState } from 'react'

export default function SubmitVideoPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<'player' | 'coach' | 'admin' | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!profile) {
        router.push('/login')
        return
      }

      // Only players, coaches, and admins can submit videos
      if (profile.role !== 'player' && profile.role !== 'coach' && profile.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      setUserId(user.id)
      setUserRole(profile.role as 'player' | 'coach' | 'admin')
      setLoading(false)
    }
    getUser()
  }, [router, supabase])

  const handleSubmitted = () => {
    // Redirect to feedback page after successful submission
    router.push('/dashboard/feedback')
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-[#272727] rounded w-1/3 animate-pulse"></div>
        <div className="h-64 bg-[#272727] rounded animate-pulse"></div>
      </div>
    )
  }

  if (!userId || !userRole) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="dotted-bg-subtle rounded-lg p-4 -m-4 sm:-m-6 lg:-m-8 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Submit Video</h1>
        </div>
      </div>

      <div className="bg-black border border-[#272727] rounded-lg p-4 sm:p-6 shadow-mvp">
        <VideoURLSubmission
          userId={userId}
          userRole={userRole}
          onSubmitted={handleSubmitted}
          alwaysShowForm={true}
        />
      </div>
    </div>
  )
}
