'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import type { Video } from '@/types/database'
import { Play, MessageSquare } from 'lucide-react'
import { MentorSelectionModal } from './MentorSelectionModal'
import { VideoPlayerModal } from './VideoPlayerModal'
import { getFullName } from '@/lib/utils'

interface VideoListProps {
  videos: Video[]
  onVideoAction?: () => void
}

export function VideoList({ videos, onVideoAction }: VideoListProps) {
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [showMentorModal, setShowMentorModal] = useState(false)
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; title: string } | null>(null)
  const supabase = createClient()

  const handleSelectMentor = async (mentorId: string) => {
    if (!selectedVideoId) return
    
    setShowMentorModal(false)
    await createSubmission(selectedVideoId, mentorId)
  }

  const handleSubmitForFeedback = (videoId: string) => {
    setSelectedVideoId(videoId)
    setShowMentorModal(true)
  }

  const createSubmission = async (videoId: string, mentorId: string) => {
    if (!videoId) return
    setSubmitting(videoId)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Create feedback submission with selected mentor
      const { data: submission, error: submissionError } = await supabase
        .from('feedback_submissions')
        .insert({
          video_id: videoId,
          player_id: user.id,
          mentor_id: mentorId,
          status: 'assigned', // Mark as assigned since mentor is selected
          payment_status: 'pending',
        })
        .select()
        .single()

      if (submissionError) throw submissionError

      // Get mentor/pro email to send draft
      const { data: mentorProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', mentorId)
        .single()

      // Send email draft to pro (for MVP-IQ workflow)
      if (mentorProfile?.email) {
        try {
          await fetch('/api/feedback/email-draft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              submissionId: submission.id,
              proEmail: mentorProfile.email,
            }),
          })

          // Also send notification email with link to dashboard
          const { data: videoData } = await supabase
            .from('videos')
            .select('title')
            .eq('id', videoId)
            .single()

          const { data: playerProfileData } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', user.id)
            .single()

          console.log('📧 [VideoList] Sending notification email to mentor:', mentorProfile.email)
          
          const mentorEmailResponse = await fetch('/api/notifications/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'new_submission',
              email: mentorProfile.email,
              data: {
                mentorName: mentorProfile.email,
                videoTitle: videoData?.title || 'Video Submission',
                playerName: getFullName(playerProfileData) || playerProfileData?.email || 'Player',
                dashboardLink: `${window.location.origin}/dashboard/feedback`,
              },
            }),
          })

          const mentorEmailResult = await mentorEmailResponse.json()
          if (mentorEmailResponse.ok) {
            console.log('✅✅✅ [VideoList] Successfully sent notification email to mentor:', mentorEmailResult)
          } else {
            console.error('❌❌❌ [VideoList] FAILED to send notification email to mentor:', mentorEmailResult)
          }
        } catch (emailError) {
          console.error('Failed to send email draft:', emailError)
          // Don't fail the submission if email fails
        }
      }

      // Create payment (or skip in dev mode)
      const response = await fetch('/api/submissions/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: submission.id }),
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Failed to create payment')

      // Update submission with payment intent (if provided)
      if (data.paymentIntentId) {
        await supabase
          .from('feedback_submissions')
          .update({ payment_intent_id: data.paymentIntentId })
          .eq('id', submission.id)
      }

      // Redirect to Stripe Checkout (only if URL provided)
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else if (data.devMode) {
        // Dev mode: Payment skipped, refresh to show updated submission
        alert('✅ Dev Mode: Payment skipped. Submission created successfully! Email draft sent to pro.')
        if (onVideoAction) {
          onVideoAction()
        }
      }
    } catch (error: any) {
      alert(error.message || 'Failed to create submission')
    } finally {
      setSubmitting(null)
    }
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#272727] mb-4">
          <Play className="w-8 h-8 text-[#ffc700]" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No videos yet</h3>
        <p className="text-[#d9d9d9] mb-6 max-w-md mx-auto">
          Upload your first video to receive professional feedback from former NFL players
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 stagger-children">
      {videos.map((video) => (
        <div
          key={video.id}
          className="border border-[#272727] rounded-lg p-4 bg-black hover:border-[#ffc700]/40 transition-all duration-300 hover-lift"
        >
          <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
            <div className="flex-1 w-full">
              <div className="flex items-start gap-3 mb-2">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#ffc700]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Play className="w-5 h-5 sm:w-6 sm:h-6 text-[#ffc700]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-white break-words">
                    {video.title}
                  </h3>
                  <p className="text-xs text-[#d9d9d9]/70 mt-1">
                    {format(new Date(video.created_at), 'PPp')}
                  </p>
                </div>
              </div>

              {video.description && (
                <p className="text-sm text-[#d9d9d9] mt-2">{video.description}</p>
              )}

              {video.file_size && (
                <p className="text-xs text-[#d9d9d9]/70 mt-2">
                  {(video.file_size / (1024 * 1024)).toFixed(2)} MB
                </p>
              )}

              <div className="mt-3">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    video.status === 'ready'
                      ? 'bg-green-900/30 text-green-400 border-green-800'
                      : video.status === 'processing'
                      ? 'bg-[#ffc700]/20 text-[#ffc700] border-[#ffc700]/40'
                      : 'bg-[#272727] text-[#d9d9d9] border-[#272727]'
                  }`}
                >
                  {video.status}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                onClick={() => setSelectedVideo({ url: video.file_path || video.video_url || '', title: video.title })}
                className="text-[#ffc700] hover:text-[#e6b300] text-sm font-medium text-center sm:text-left px-3 py-2 rounded-md hover:bg-[#272727] transition-all duration-300 active:scale-95 touch-manipulation border border-[#272727] hover:border-[#ffc700]/40"
              >
                View Video
              </button>
              <button
                onClick={() => handleSubmitForFeedback(video.id)}
                disabled={submitting === video.id || video.status !== 'ready'}
                className="flex items-center justify-center gap-2 bg-[#ffc700] text-black px-4 py-2 rounded-md hover:bg-[#e6b300] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 active:scale-95 hover:shadow-lg text-sm font-medium touch-manipulation"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">{submitting === video.id ? 'Processing...' : 'Request Feedback ($50)'}</span>
                <span className="sm:hidden">{submitting === video.id ? 'Processing...' : 'Request ($50)'}</span>
              </button>
            </div>
          </div>
        </div>
      ))}
      
      <MentorSelectionModal
        isOpen={showMentorModal}
        onClose={() => {
          setShowMentorModal(false)
          setSelectedVideoId(null)
        }}
        onSelect={handleSelectMentor}
        loading={submitting !== null}
      />

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
