'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Video, Plus, X, CreditCard, AlertCircle } from 'lucide-react'
import { MentorSelectionModal } from './MentorSelectionModal'

interface VideoURLSubmissionProps {
  userId: string
  userRole: 'player' | 'coach' | 'admin'
  teamId?: string | null
  onSubmitted?: () => void
  alwaysShowForm?: boolean // If true, always show the form (for dedicated submit page)
}

export function VideoURLSubmission({
  userId,
  userRole,
  teamId,
  onSubmitted,
  alwaysShowForm = false,
}: VideoURLSubmissionProps) {
  const [showForm, setShowForm] = useState(alwaysShowForm)
  const [submitting, setSubmitting] = useState(false)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [formData, setFormData] = useState({
    videoUrl: '',
    title: '',
    description: '',
    playerNumbers: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [selectedMentorId, setSelectedMentorId] = useState<string | null>(null)
  const [showMentorModal, setShowMentorModal] = useState(false)
  const [videoId, setVideoId] = useState<string | null>(null)
  const supabase = createClient()

  const validateURL = (url: string) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const handleInitiateCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateURL(formData.videoUrl)) {
      setError('Please enter a valid video URL')
      return
    }

    if (!formData.title) {
      setError('Please provide a title for your video')
      return
    }

    // Show mentor selection modal
    setShowMentorModal(true)
  }

  const handleMentorSelected = async (mentorId: string) => {
    setSelectedMentorId(mentorId)
    setShowMentorModal(false)
    await processSubmission(mentorId)
  }

  const processSubmission = async (mentorId: string) => {
    if (!formData.videoUrl || !formData.title || !mentorId) {
      setError('Please provide a video URL, title, and select a mentor')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Check monthly video limit for coaches (15 per month)
      if (userRole === 'coach' || userRole === 'admin') {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        
        const { data: monthlyVideos, error: countError } = await supabase
          .from('videos')
          .select('id', { count: 'exact', head: false })
          .eq('submitted_by', userId)
          .gte('created_at', startOfMonth.toISOString())

        if (countError) throw countError

        if ((monthlyVideos?.length || 0) >= 15) {
          setError('You have reached your monthly limit of 15 video submissions. Please wait until next month or contact support.')
          setSubmitting(false)
          return
        }
      }

      // Verify user has a profile (required for RLS to work)
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', user.id)
        .single()

      // If profile doesn't exist, try to create it via API
      if (profileError || !profile) {
        const ensureResponse = await fetch('/api/profile/ensure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            email: user.email,
            firstName: user.user_metadata?.first_name || '',
            lastName: user.user_metadata?.last_name || '',
            role: user.user_metadata?.role || 'player',
          }),
        })

        if (!ensureResponse.ok) {
          const errorData = await ensureResponse.json()
          throw new Error(`Failed to create profile: ${errorData.error || 'Unknown error'}`)
        }

        // Retry fetching the profile
        const retryResult = await supabase
          .from('profiles')
          .select('id, role')
          .eq('id', user.id)
          .single()

        if (retryResult.error || !retryResult.data) {
          throw new Error('Profile creation succeeded but could not be retrieved. Please refresh the page.')
        }
        profile = retryResult.data
      }

      // Determine player_id
      let playerId = userId
      if (userRole === 'coach' || userRole === 'admin') {
        playerId = userId
      }

      // Create video record with pending status (will be updated to ready after payment)
      const { data: video, error: dbError } = await supabase
        .from('videos')
        .insert({
          player_id: playerId,
          title: formData.title,
          description: formData.description || null,
          video_url: formData.videoUrl,
          file_path: formData.videoUrl, // For compatibility
          player_numbers: formData.playerNumbers || null,
          submitted_by: userRole === 'coach' || userRole === 'admin' ? userId : null,
          team_id: teamId || null,
          status: 'pending', // Will be updated to 'ready' after payment
        })
        .select()
        .single()

      if (dbError) throw dbError

      setVideoId(video.id)

      // Now create payment checkout
      setProcessingPayment(true)
      setSubmitting(false)

      console.log('📤 [CLIENT] Calling payment API with:', { videoId: video.id, mentorId: mentorId })
      
      const response = await fetch('/api/videos/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video.id, mentorId: mentorId }),
      })

      const data = await response.json()
      console.log('📥 [CLIENT] Payment API response:', { ok: response.ok, devMode: data.devMode, data })

      if (!response.ok) {
        console.error('❌ [CLIENT] Payment API error:', data)
        throw new Error(data.error || 'Failed to create payment')
      }

      // If dev mode, video is already ready
      if (data.devMode) {
        console.log('✅ [CLIENT] Dev mode - payment skipped, emails should have been sent')
        setFormData({
          videoUrl: '',
          title: '',
          description: '',
          playerNumbers: '',
        })
        setShowForm(false)
        setVideoId(null)
        setSelectedMentorId(null)
        setProcessingPayment(false)
        if (onSubmitted) {
          onSubmitted()
        }
        alert('✅ Dev Mode: Payment skipped. Video submitted successfully!')
        return
      }

      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (err: any) {
      setError(err.message || 'Submission failed')
      setSubmitting(false)
      setProcessingPayment(false)
    }
  }

  return (
    <div className="space-y-4">
      {!showForm && !alwaysShowForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 bg-[#ffc700] text-black px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg hover:bg-[#e6b300] transition font-medium w-full sm:w-auto touch-manipulation"
        >
          <Plus className="w-5 h-5" />
          Submit a New Video
        </button>
      ) : (
        <div className="bg-black border border-[#272727] rounded-lg p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-white">
                Submit a New Video
              </h3>
              <p className="text-xs text-[#d9d9d9]/70 mt-1">
                Share a YouTube or Hudl video link for professional analysis
              </p>
            </div>
            {!alwaysShowForm && (
              <button
                onClick={() => {
                  setShowForm(false)
                  setError(null)
                  setFormData({ videoUrl: '', title: '', description: '', playerNumbers: '' })
                }}
                className="text-[#d9d9d9] hover:text-white p-1 touch-manipulation"
                aria-label="Close form"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-800 text-red-400 px-3 sm:px-4 py-2 sm:py-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          {/* Instructions */}
          <div className="mb-4 p-3 bg-[#272727]/50 border border-[#ffc700]/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-[#ffc700] flex-shrink-0 mt-0.5" />
              <div className="text-sm text-[#d9d9d9]">
                <p className="font-medium text-white mb-1">Video URL Submission:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Paste a link from <strong className="text-[#ffc700]">YouTube</strong>, <strong className="text-[#ffc700]">Hudl</strong>, or any publicly accessible video</li>
                  <li>Make sure the video is publicly viewable (not private)</li>
                  <li>After submission, you&apos;ll select a mentor and proceed to payment</li>
                </ul>
              </div>
            </div>
          </div>

          <form onSubmit={handleInitiateCheckout} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#d9d9d9] mb-1">
                Video URL <span className="text-[#ffc700]">*</span>
              </label>
              <input
                type="url"
                value={formData.videoUrl}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                required
                disabled={submitting || processingPayment}
                placeholder="https://youtube.com/watch?v=... or https://hudl.com/..."
                className="w-full px-3 py-2.5 text-base border border-[#ffc700] rounded-md bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700] touch-manipulation placeholder:text-[#d9d9d9]/50 disabled:opacity-50"
              />
              <p className="text-xs text-[#d9d9d9]/70 mt-1">
                Supported platforms: YouTube, Hudl, or any publicly accessible video URL
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#d9d9d9] mb-1">
                Title <span className="text-[#ffc700]">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                disabled={submitting || processingPayment}
                placeholder="Enter video title"
                className="w-full px-3 py-2.5 text-base border border-[#ffc700] rounded-md bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700] touch-manipulation placeholder:text-[#d9d9d9]/50 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#d9d9d9] mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                disabled={submitting || processingPayment}
                placeholder="Describe what you'd like reviewed (e.g., 'Third quarter performance', 'Passing mechanics', 'Defensive positioning')..."
                className="w-full px-3 py-2.5 text-base border border-[#ffc700] rounded-md bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700] resize-none touch-manipulation placeholder:text-[#d9d9d9]/50 disabled:opacity-50"
              />
              <p className="text-xs text-[#d9d9d9]/70 mt-1">
                Help mentors understand what to focus on in their analysis
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#d9d9d9] mb-1">
                Player Number(s)
              </label>
              <input
                type="text"
                value={formData.playerNumbers}
                onChange={(e) => setFormData({ ...formData, playerNumbers: e.target.value })}
                placeholder="e.g., 23 or 23, 45, 67"
                className="w-full px-3 py-2.5 text-base border border-[#ffc700] rounded-md bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700] touch-manipulation placeholder:text-[#d9d9d9]/50"
              />
              <p className="text-xs text-[#d9d9d9]/70 mt-1">
                Optional: Specify which player numbers to review if multiple players are in the video
              </p>
            </div>

            <div className={`flex flex-col sm:flex-row gap-3 pt-2 ${alwaysShowForm ? 'justify-end' : ''}`}>
              {!alwaysShowForm && (
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setError(null)
                    setFormData({ videoUrl: '', title: '', description: '', playerNumbers: '' })
                    setSelectedMentorId(null)
                  }}
                  disabled={submitting || processingPayment}
                  className="flex-1 px-4 py-2.5 border border-[#272727] rounded-md text-[#d9d9d9] hover:bg-[#272727] transition touch-manipulation font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={submitting || processingPayment || !formData.videoUrl || !formData.title}
                className={`px-4 py-2.5 bg-[#ffc700] text-black rounded-md hover:bg-[#e6b300] disabled:opacity-50 disabled:cursor-not-allowed transition font-medium touch-manipulation flex items-center justify-center gap-2 ${alwaysShowForm ? 'w-full sm:w-auto' : 'flex-1'}`}
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    Submitting...
                  </>
                ) : processingPayment ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    {selectedMentorId ? 'Checkout ($50)' : 'Continue to Mentor Selection'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      <MentorSelectionModal
        isOpen={showMentorModal}
        onClose={() => setShowMentorModal(false)}
        onSelect={handleMentorSelected}
        loading={submitting || processingPayment}
      />
    </div>
  )
}
