'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import type { FeedbackSubmission, Profile } from '@/types/database'
import { Play, MessageSquare } from 'lucide-react'
import { VideoPlayerModal } from '@/components/video/VideoPlayerModal'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { FeedbackProgressTracker } from './FeedbackProgressTracker'
import { getFullName, getInitials as getProfileInitials } from '@/lib/utils'

interface SubmissionListProps {
  submissions: FeedbackSubmission[]
  userRole: 'player' | 'mentor' | 'coach'
  onUpdate?: () => void
  onSelectSubmission?: (submission: FeedbackSubmission) => void
  onViewFeedback?: (submissionId: string) => void
  isNewFeedback?: boolean // Indicates if this is the "new feedback" section
}

export function SubmissionList({
  submissions,
  userRole,
  onUpdate,
  onSelectSubmission,
  onViewFeedback,
  isNewFeedback = false,
}: SubmissionListProps) {
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; title: string } | null>(null)

  if (submissions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#272727] mb-4">
          <MessageSquare className="w-8 h-8 text-[#ffc700]" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No submissions yet</h3>
        <p className="text-[#d9d9d9]">
          {userRole === 'player' 
            ? 'Submit a video to request feedback from professional mentors'
            : 'No feedback requests at this time'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 stagger-children">
      {submissions.map((submission) => {
        const video = submission.videos as any

        const isClickable = userRole === 'mentor' && submission.status !== 'completed' && onSelectSubmission

        const mentor = (submission as any).mentor as Profile | undefined

        return (
          <div
            key={submission.id}
            className={`border-2 border-[#272727] rounded-xl p-5 sm:p-6 bg-gradient-to-br from-black to-[#272727]/50 shadow-lg transition-all duration-300 ${
              isClickable
                ? 'hover:border-[#ffc700]/60 hover-lift cursor-pointer hover:bg-gradient-to-br hover:from-[#272727] hover:to-[#272727]/70 hover:shadow-xl'
                : 'hover:border-[#ffc700]/30 hover:shadow-xl'
            }`}
            onClick={isClickable ? () => onSelectSubmission(submission) : undefined}
            title={isClickable ? 'Click to provide feedback' : undefined}
          >
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex-1 w-full">
                {/* Mentor Info Header - Premium styling */}
                {mentor && submission.status === 'completed' && (
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#272727]">
                    {(mentor as any).profile_photo_url ? (
                      <img
                        src={(mentor as any).profile_photo_url}
                        alt={getFullName(mentor) || 'Mentor'}
                        className="w-10 h-10 rounded-full object-cover border-2 border-[#ffc700]/40"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ffc700]/20 to-[#ffc700]/10 border-2 border-[#ffc700]/40 flex items-center justify-center">
                        <span className="text-sm font-bold text-[#ffc700]">
                          {getProfileInitials(mentor)}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-[#d9d9d9]/70 uppercase tracking-wide">Reviewed by</p>
                      <p className="text-sm font-semibold text-[#ffc700]">
                        {getFullName(mentor) || mentor.email}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#ffc700]/20 to-[#ffc700]/10 rounded-lg flex items-center justify-center flex-shrink-0 border border-[#ffc700]/30">
                    <Play className="w-5 h-5 sm:w-6 sm:h-6 text-[#ffc700]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-bold text-white break-words">
                        {video?.title || 'Untitled Video'}
                      </h3>
                      {isNewFeedback && submission.status === 'completed' && submission.feedback_text && (
                        <span className="px-2.5 py-1 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-bold rounded-full shadow-md">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#d9d9d9]/70 mt-1">
                      Submitted {format(new Date(submission.created_at), 'PPp')}
                    </p>
                  </div>
                </div>

                {submission.player_notes && (
                  <div className="mt-3 p-3 bg-blue-900/20 border border-blue-800 rounded">
                    <p className="text-sm font-medium text-blue-400 mb-1">
                      Player Notes:
                    </p>
                    <p className="text-sm text-blue-300">
                      {submission.player_notes}
                    </p>
                  </div>
                )}

                {video?.player_numbers && (
                  <div className="mt-2 text-sm text-[#d9d9d9]">
                    <span className="text-[#d9d9d9]/70">Player Number(s):</span>{' '}
                    <span className="text-white font-medium">{video.player_numbers}</span>
                  </div>
                )}

                {(video?.video_url || video?.file_path) && (
                  <div 
                    className="mt-3 p-3 bg-[#272727]/50 border border-[#272727] rounded-lg"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-xs text-[#d9d9d9]/70 mb-1">Video Link:</p>
                    <a
                      href={video.video_url || video.file_path || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#ffc700] hover:text-[#e6b300] inline-flex items-center gap-1 underline break-all font-medium"
                    >
                      {video.video_url || video.file_path} <span>→</span>
                    </a>
                  </div>
                )}

                {/* Progress Tracker - Show for players when feedback is not completed */}
                {userRole === 'player' && submission.status !== 'completed' && (
                  <div className="mt-4 p-4 bg-[#272727]/30 border border-[#272727] rounded-lg">
                    <FeedbackProgressTracker submission={submission} />
                  </div>
                )}

                {submission.feedback_text && (
                  <div 
                    className="mt-4 p-5 bg-gradient-to-br from-green-900/30 to-green-800/20 border-2 border-green-500/40 rounded-lg shadow-lg"
                    onMouseEnter={() => onViewFeedback?.(submission.id)}
                    onClick={() => onViewFeedback?.(submission.id)}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-5 bg-[#ffc700] rounded-full"></div>
                      <p className="text-sm font-bold text-green-400 uppercase tracking-wide">
                        Professional Feedback
                      </p>
                    </div>
                    <p className="text-sm text-green-200 whitespace-pre-wrap leading-relaxed">
                      {submission.feedback_text}
                    </p>
                    {submission.feedback_video_url && (
                      <div className="mt-3">
                        <a
                          href={submission.feedback_video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-green-400 hover:text-green-300 inline-flex items-center gap-1 underline"
                        >
                          Watch Feedback Video <span>→</span>
                        </a>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 mt-4 flex-wrap">
                  <StatusBadge status={submission.status} type="submission" />
                </div>
              </div>

              <div 
                className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                {(video?.file_path || video?.video_url) && (
                  <button
                    onClick={() => setSelectedVideo({ 
                      url: video.video_url || video.file_path || '', 
                      title: video.title || 'Video' 
                    })}
                    className="text-[#ffc700] hover:text-[#e6b300] text-sm font-medium text-center px-3 py-2 rounded-md hover:bg-[#272727] transition-all duration-300 active:scale-95 touch-manipulation border border-[#272727] hover:border-[#ffc700]/40"
                  >
                    View Video
                  </button>
                )}

                {userRole === 'mentor' &&
                  submission.status !== 'completed' &&
                  onSelectSubmission && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectSubmission(submission)
                      }}
                      className="bg-[#ffc700] text-black px-4 py-2.5 rounded-md hover:bg-[#e6b300] transition-all duration-300 active:scale-95 hover:shadow-lg text-sm font-medium touch-manipulation w-full sm:w-auto"
                    >
                      {submission.status === 'pending' ||
                      submission.status === 'assigned'
                        ? 'Review & Provide Feedback'
                        : 'Continue Feedback'}
                    </button>
                  )}

                {userRole === 'player' &&
                  submission.payment_status === 'pending' &&
                  submission.payment_intent_id && (
                    <button
                      onClick={async () => {
                        // Redirect to payment if needed
                        const response = await fetch(
                          `/api/submissions/payment?intent=${submission.payment_intent_id}`
                        )
                        const data = await response.json()
                        if (data.checkoutUrl) {
                          window.location.href = data.checkoutUrl
                        }
                      }}
                      className="bg-green-600 text-white px-4 py-2.5 rounded-md hover:bg-green-700 transition text-sm font-medium touch-manipulation w-full sm:w-auto"
                    >
                      Complete Payment
                    </button>
                  )}
              </div>
            </div>
          </div>
        )
      })}

      {selectedVideo && (
        <VideoPlayerModal
          isOpen={!!selectedVideo}
          onClose={() => setSelectedVideo(null)}
          videoUrl={selectedVideo.url}
          videoTitle={selectedVideo.title}
        />
      )}
    </div>
  )
}
