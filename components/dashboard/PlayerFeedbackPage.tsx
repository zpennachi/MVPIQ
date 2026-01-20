'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { VideoURLSubmission } from '@/components/video/VideoURLSubmission'
import { SubmissionList } from '@/components/feedback/SubmissionList'
import type { FeedbackSubmission } from '@/types/database'
import { MessageSquare, HelpCircle } from 'lucide-react'
import Link from 'next/link'

interface PlayerFeedbackPageProps {
  userId: string
}

export function PlayerFeedbackPage({ userId }: PlayerFeedbackPageProps) {
  const [submissions, setSubmissions] = useState<FeedbackSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'completed' | 'under_review'>('all')
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

  const handleVideoUploaded = () => {
    loadData()
  }

  const filteredSubmissions = () => {
    if (filter === 'completed') {
      return submissions.filter(s => s.status === 'completed')
    } else if (filter === 'under_review') {
      return submissions.filter(s => s.status !== 'completed' && s.status !== 'paid')
    }
    return submissions
  }

  const pendingCount = submissions.filter(s => s.status !== 'completed').length

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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Gameplay Feedback</h1>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-black border border-[#272727] rounded-lg p-4 sm:p-6 shadow-mvp">
        <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">Submit New Video</h2>
        <VideoURLSubmission
          userId={userId}
          userRole="player"
          onSubmitted={handleVideoUploaded}
        />
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            filter === 'all'
              ? 'bg-[#ffc700] text-black'
              : 'bg-[#272727] text-[#d9d9d9] hover:bg-[#272727]/80'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            filter === 'completed'
              ? 'bg-[#ffc700] text-black'
              : 'bg-[#272727] text-[#d9d9d9] hover:bg-[#272727]/80'
          }`}
        >
          Complete Feedback
        </button>
        <button
          onClick={() => setFilter('under_review')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            filter === 'under_review'
              ? 'bg-[#ffc700] text-black'
              : 'bg-[#272727] text-[#d9d9d9] hover:bg-[#272727]/80'
          }`}
        >
          Under Review
        </button>
      </div>

      {/* Detailed Feedback List */}
      <div className="bg-black border border-[#272727] rounded-lg shadow-mvp p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">All Feedback Submissions</h2>
        <SubmissionList submissions={filteredSubmissions()} userRole="player" onUpdate={loadData} />
        
        {/* Need Help Button */}
        {pendingCount > 0 && (
          <div className="mt-6 pt-6 border-t border-[#272727]">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-[#ffc700] hover:text-[#e6b300] text-sm font-medium transition"
            >
              <HelpCircle className="w-4 h-4" />
              Need help with your order?
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
