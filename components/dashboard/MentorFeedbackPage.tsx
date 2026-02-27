'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SubmissionList } from '@/components/feedback/SubmissionList'
import { FeedbackForm } from '@/components/feedback/FeedbackForm'
import type { FeedbackSubmission } from '@/types/database'
import { MessageSquare } from 'lucide-react'

interface MentorFeedbackPageProps {
  mentorId: string
}

export function MentorFeedbackPage({ mentorId }: MentorFeedbackPageProps) {
  const [submissions, setSubmissions] = useState<FeedbackSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSubmission, setSelectedSubmission] = useState<FeedbackSubmission | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'assigned' | 'completed'>('all')
  const supabase = createClient()

  useEffect(() => {
    loadSubmissions()
  }, [mentorId, filter])

  const loadSubmissions = async () => {
    setLoading(true)
    let query = supabase
      .from('feedback_submissions')
      .select('*, videos(*)')
      .order('created_at', { ascending: false })

    if (filter === 'pending') {
      query = query.eq('status', 'pending')
    } else if (filter === 'assigned') {
      query = query.eq('mentor_id', mentorId).in('status', ['assigned', 'in_progress'])
    } else if (filter === 'completed') {
      query = query.eq('status', 'completed')
    }

    const { data } = await query
    if (data) setSubmissions(data as FeedbackSubmission[])
    setLoading(false)
  }

  const handleFeedbackSubmitted = () => {
    setSelectedSubmission(null)
    loadSubmissions()
  }

  const newSubmissions = submissions.filter(s => s.status === 'pending' || s.status === 'assigned')
  const pendingCount = newSubmissions.length
  const completedCount = submissions.filter(s => s.status === 'completed').length

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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Feedback Management</h1>
        </div>
      </div>

      {/* New Submissions - Most Visible */}
      {newSubmissions.length > 0 && (
        <div className="bg-gradient-to-r from-[#ffc700]/10 to-[#ffc700]/5 border-2 border-[#ffc700]/40 rounded-lg shadow-mvp p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#ffc700] rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-black" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">New Submissions</h2>
              <p className="text-sm text-[#d9d9d9]">{pendingCount} submission{pendingCount !== 1 ? 's' : ''} awaiting your review</p>
            </div>
          </div>
          <SubmissionList
            submissions={newSubmissions}
            userRole="mentor"
            onUpdate={loadSubmissions}
            onSelectSubmission={setSelectedSubmission}
          />
        </div>
      )}

      {/* All Submissions */}
      <div className="bg-black border border-[#272727] rounded-lg shadow-mvp p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-1">All Feedback Submissions</h2>
            <p className="text-sm text-[#d9d9d9]">
              {filter === 'all' 
                ? 'View all feedback requests'
                : `Showing ${filter} submissions`}
            </p>
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="w-full sm:w-auto border border-[#ffc700] rounded-md px-3 py-2 text-base bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700] touch-manipulation"
          >
            <option value="all">All Submissions</option>
            <option value="pending">Pending</option>
            <option value="assigned">Assigned to Me</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {selectedSubmission ? (
          <FeedbackForm
            submission={selectedSubmission}
            onSubmitted={handleFeedbackSubmitted}
            onCancel={() => setSelectedSubmission(null)}
          />
        ) : (
          <SubmissionList
            submissions={submissions}
            userRole="mentor"
            onUpdate={loadSubmissions}
            onSelectSubmission={setSelectedSubmission}
          />
        )}
      </div>
    </div>
  )
}
