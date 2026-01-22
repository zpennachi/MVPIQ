'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SubmissionList } from '@/components/feedback/SubmissionList'
import type { FeedbackSubmission } from '@/types/database'
import { MessageSquare } from 'lucide-react'
import Link from 'next/link'

interface PlayerFeedbackPageProps {
  userId: string
}

export function PlayerFeedbackPage({ userId }: PlayerFeedbackPageProps) {
  const [submissions, setSubmissions] = useState<FeedbackSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [userId])

  const loadData = async () => {
    setLoading(true)
    const { data: submissionsData } = await supabase
      .from('feedback_submissions')
      .select('*, videos(*)')
      .eq('player_id', userId)
      .order('created_at', { ascending: false })

    if (submissionsData) setSubmissions(submissionsData as FeedbackSubmission[])
    setLoading(false)
  }

  // Separate under review and completed, show under review first
  const underReview = submissions.filter(s => s.status !== 'completed')
  const completed = submissions.filter(s => s.status === 'completed')
  const sortedSubmissions = [...underReview, ...completed]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-[#272727] rounded w-1/3 animate-pulse"></div>
        <div className="h-64 bg-[#272727] rounded animate-pulse"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="dotted-bg-subtle rounded-lg p-4 -m-4 sm:-m-6 lg:-m-8 mb-6">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 dark:text-yellow-400" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">My Feedback</h1>
        </div>
      </div>

      <div className="space-y-6">
        {/* Under Review Section - Show First and Distinct */}
        {underReview.length > 0 && (
          <div className="bg-gradient-to-r from-[#ffc700]/10 to-[#ffc700]/5 border-2 border-[#ffc700]/40 rounded-lg shadow-mvp p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">Under Review</h2>
            <p className="text-sm text-[#d9d9d9]/70 mb-4">
              Your videos are being reviewed by professional mentors
            </p>
            <SubmissionList 
              submissions={underReview} 
              userRole="player" 
              onUpdate={loadData} 
            />
          </div>
        )}

        {/* Completed Feedback Section */}
        {completed.length > 0 && (
          <div className="bg-black border border-[#272727] rounded-lg shadow-mvp p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">Completed Feedback</h2>
            <SubmissionList 
              submissions={completed} 
              userRole="player" 
              onUpdate={loadData} 
            />
          </div>
        )}

        {sortedSubmissions.length === 0 && (
          <div className="bg-black border border-[#272727] rounded-lg shadow-mvp p-12 text-center">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 text-[#272727]" />
            <h3 className="text-lg font-semibold text-white mb-2">No feedback submissions yet</h3>
            <p className="text-[#d9d9d9] mb-6">Submit a video to receive professional feedback</p>
            <Link
              href="/dashboard/feedback/submit-video"
              className="inline-block px-4 py-2 bg-[#ffc700] text-black rounded-md hover:bg-[#e6b300] transition font-medium"
            >
              Submit Video
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
