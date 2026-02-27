'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { FeedbackSubmission, Profile } from '@/types/database'
import { X } from 'lucide-react'
import { getFullName } from '@/lib/utils'

interface FeedbackFormProps {
  submission: FeedbackSubmission
  onSubmitted: () => void
  onCancel: () => void
}

export function FeedbackForm({
  submission,
  onSubmitted,
  onCancel,
}: FeedbackFormProps) {
  const [feedbackText, setFeedbackText] = useState('')
  const [mentorNotes, setMentorNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // Load existing feedback if any
    if (submission.feedback_text) {
      setFeedbackText(submission.feedback_text)
    }
    if (submission.mentor_notes) {
      setMentorNotes(submission.mentor_notes)
    }
  }, [submission])

  const video = submission.videos as any

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Check if mentor is assigned, if not assign them
      let updateData: any = {
        feedback_text: feedbackText,
        mentor_notes: mentorNotes,
        updated_at: new Date().toISOString(),
      }

      if (!submission.mentor_id) {
        updateData.mentor_id = user.id
      }

      if (submission.status !== 'completed') {
        updateData.status = 'in_progress'
      }

      // Update submission
      const { error: updateError } = await supabase
        .from('feedback_submissions')
        .update(updateData)
        .eq('id', submission.id)

      if (updateError) throw updateError

      // If marking as completed, update completed_at
      if (submission.status !== 'completed' && feedbackText.trim().length > 0) {
        const { error: completeError } = await supabase
          .from('feedback_submissions')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', submission.id)

        if (completeError) throw completeError

        // Send feedback ready notification to player
        try {
          const { data: playerProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', submission.player_id)
            .single()

          if (playerProfile?.email) {
            // Get mentor name for email
            const { data: mentorProfile } = await supabase
              .from('profiles')
              .select('first_name, last_name, email')
              .eq('id', user.id)
              .single()

            await fetch('/api/notifications/email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'feedback_ready',
                email: playerProfile.email,
                data: {
                  videoTitle: video?.title,
                  feedbackText: feedbackText,
                  rating: submission.rating || 0,
                  mentorName: getFullName(mentorProfile) || mentorProfile?.email || 'Your mentor',
                },
              }),
            })
          }
        } catch (emailError) {
          console.error('Failed to send feedback ready email:', emailError)
        }
      }

      // Mark this feedback as seen in localStorage (only on client side)
      if (typeof window !== 'undefined') {
        try {
          const seenIds = JSON.parse(localStorage.getItem('seen_feedback_ids') || '[]')
          if (!seenIds.includes(submission.id)) {
            localStorage.setItem('seen_feedback_ids', JSON.stringify([...seenIds, submission.id]))
          }
        } catch (e) {
          console.error('Error marking feedback as seen:', e)
        }
      }

      onSubmitted()
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg sm:text-xl font-semibold text-white">Provide Professional Feedback</h3>
          <p className="text-sm text-[#d9d9d9]/70 mt-1">
            Share your expert analysis to help the player improve
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-[#d9d9d9] hover:text-white p-1 touch-manipulation"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {video && (
        <div className="border border-[#272727] rounded-lg p-4 bg-[#272727]/50">
          <p className="font-medium text-white mb-2 break-words">Video: {video.title}</p>
          {video.description && (
            <p className="text-sm text-[#d9d9d9] break-words mb-3">{video.description}</p>
          )}
          {(video.video_url || video.file_path) && (
            <a
              href={video.video_url || video.file_path || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#ffc700] hover:text-[#e6b300] text-sm font-medium inline-flex items-center gap-1 touch-manipulation underline break-all"
            >
              {video.video_url || video.file_path} <span>→</span>
            </a>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-400 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-[#d9d9d9] mb-1">
            Feedback Text <span className="text-[#ffc700]">*</span>
          </label>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            required
            rows={8}
            className="w-full px-3 py-2.5 text-base border border-[#ffc700] rounded-md bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700] resize-none touch-manipulation placeholder:text-[#d9d9d9]/50"
            placeholder="Provide detailed feedback on the player's performance, technique, strengths, areas for improvement, etc. Be specific and actionable."
          />
          <p className="text-xs text-[#d9d9d9]/70 mt-1">
            This feedback will be visible to the player. Be constructive and specific.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#d9d9d9] mb-1">
            Mentor Notes (Internal - Private)
          </label>
          <textarea
            value={mentorNotes}
            onChange={(e) => setMentorNotes(e.target.value)}
            rows={4}
            className="w-full px-3 py-2.5 text-base border border-[#272727] rounded-md bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700] resize-none touch-manipulation placeholder:text-[#d9d9d9]/50"
            placeholder="Private notes for your reference only (optional)"
          />
          <p className="text-xs text-[#d9d9d9]/70 mt-1">
            These notes are private and will not be shared with the player
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 border border-[#272727] rounded-md text-[#d9d9d9] hover:bg-[#272727] transition font-medium touch-manipulation"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !feedbackText.trim()}
            className="bg-[#ffc700] text-black px-4 py-2.5 rounded-md hover:bg-[#e6b300] disabled:opacity-50 disabled:cursor-not-allowed transition font-medium touch-manipulation"
          >
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </form>
    </div>
  )
}
