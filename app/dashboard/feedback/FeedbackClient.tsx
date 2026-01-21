'use client'

import { useState } from 'react'
import { VideoURLSubmission } from '@/components/video/VideoURLSubmission'
import { SubmissionList } from '@/components/feedback/SubmissionList'
import type { FeedbackSubmission } from '@/types/database'

interface FeedbackClientProps {
  userId: string
  submissions: FeedbackSubmission[]
  onUpdate: () => void
}

export function FeedbackClient({ userId, submissions, onUpdate }: FeedbackClientProps) {
  const [activeTab, setActiveTab] = useState<'submit' | 'my-feedback'>('submit')

  // Separate under review and completed
  const underReview = submissions.filter(s => s.status !== 'completed')
  const completed = submissions.filter(s => s.status === 'completed')

  // Sort: under review first, then completed
  const sortedSubmissions = [...underReview, ...completed]

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#272727]">
        <button
          onClick={() => setActiveTab('submit')}
          className={`px-4 py-2 font-medium transition ${
            activeTab === 'submit'
              ? 'text-[#ffc700] border-b-2 border-[#ffc700]'
              : 'text-[#d9d9d9] hover:text-white'
          }`}
        >
          Submit Video
        </button>
        <button
          onClick={() => setActiveTab('my-feedback')}
          className={`px-4 py-2 font-medium transition ${
            activeTab === 'my-feedback'
              ? 'text-[#ffc700] border-b-2 border-[#ffc700]'
              : 'text-[#d9d9d9] hover:text-white'
          }`}
        >
          My Feedback
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'submit' && (
        <div className="bg-black border border-[#272727] rounded-lg p-4 sm:p-6 shadow-mvp">
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">Submit New Video</h2>
          <VideoURLSubmission
            userId={userId}
            userRole="player"
            onSubmitted={onUpdate}
          />
        </div>
      )}

      {activeTab === 'my-feedback' && (
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
                onUpdate={onUpdate} 
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
                onUpdate={onUpdate} 
              />
            </div>
          )}

          {sortedSubmissions.length === 0 && (
            <div className="bg-black border border-[#272727] rounded-lg shadow-mvp p-12 text-center">
              <p className="text-[#d9d9d9]">No feedback submissions yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
