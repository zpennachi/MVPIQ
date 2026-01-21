'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SubmissionList } from '@/components/feedback/SubmissionList'
import { FeedbackForm } from '@/components/feedback/FeedbackForm'
import { MentorAvailability } from '@/components/calendar/MentorAvailability'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import type { FeedbackSubmission, BookedSession, Profile } from '@/types/database'
import { MessageSquare, CheckCircle, Clock, User, Calendar, X, Film } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

interface MentorDashboardProps {
  mentorId: string
}

export function MentorDashboard({ mentorId }: MentorDashboardProps) {
  const [submissions, setSubmissions] = useState<FeedbackSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSubmission, setSelectedSubmission] = useState<FeedbackSubmission | null>(null)
  const [profile, setProfile] = useState<{ full_name: string | null; email: string; profile_photo_url: string | null } | null>(null)
  const [upcomingSessions, setUpcomingSessions] = useState<(BookedSession & { user?: Profile })[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const loadProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, email, profile_photo_url')
        .eq('id', mentorId)
        .single()
      if (data) setProfile(data)
    }
    loadProfile()
  }, [mentorId])

  useEffect(() => {
    loadSubmissions()
  }, [mentorId])

  useEffect(() => {
    loadUpcomingSessions()
  }, [mentorId])

  const loadSubmissions = async () => {
    setLoading(true)
    
    // Load all submissions for overview
    const { data } = await supabase
      .from('feedback_submissions')
      .select('*, videos(*)')
      .order('created_at', { ascending: false })

    if (data) {
      setSubmissions(data as FeedbackSubmission[])
    }

    setLoading(false)
  }

  const loadUpcomingSessions = async () => {
    setLoadingSessions(true)
    try {
      // First get the sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('booked_sessions')
        .select('*')
        .eq('mentor_id', mentorId)
        .in('status', ['pending', 'confirmed'])
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })

      if (sessionsError) {
        console.error('Error loading sessions:', sessionsError)
        setUpcomingSessions([])
        return
      }

      if (!sessions || sessions.length === 0) {
        setUpcomingSessions([])
        return
      }

      // Get all unique user IDs
      const userIds = Array.from(new Set(sessions.map(s => s.user_id)))
      console.log('Fetching profiles for user IDs:', userIds)
      
      // Fetch all user profiles in one query
      const { data: userProfiles, error: usersError } = await supabase
        .from('profiles')
        .select('id, email, full_name, profile_photo_url')
        .in('id', userIds)

      console.log('Profile query result:', { userProfiles, usersError, count: userProfiles?.length || 0 })

      if (usersError) {
        console.error('Error loading user profiles:', usersError)
      }

      // Create a map of user_id -> user profile
      const userMap = new Map()
      if (userProfiles && userProfiles.length > 0) {
        userProfiles.forEach(user => {
          userMap.set(user.id, user)
          console.log('Mapped user:', user.id, user.full_name || user.email)
        })
      } else {
        console.warn('No user profiles returned! Expected:', userIds.length, 'Got:', 0)
      }
      
      console.log('User map size:', userMap.size, 'Expected:', userIds.length)

      // Combine sessions with user data
      const sessionsWithUsers = sessions.map(session => {
        const user = userMap.get(session.user_id)
        if (!user) {
          console.warn('No user profile found for session:', session.id, 'user_id:', session.user_id)
        }
        return {
          ...session,
          user: user || null,
        }
      })

      console.log('Loaded sessions with users:', sessionsWithUsers.length, sessionsWithUsers)
      setUpcomingSessions(sessionsWithUsers as any)
    } catch (error) {
      console.error('Unexpected error loading sessions:', error)
      setUpcomingSessions([])
    } finally {
      setLoadingSessions(false)
    }
  }

  const handleCancelSession = async (sessionId: string, session: BookedSession & { user?: Profile }) => {
    const userName = session.user?.full_name || session.user?.email || 'the user'
    if (!confirm(`Are you sure you want to cancel this session with ${userName}?`)) {
      return
    }

    // User data should already be loaded from the join query (same as PlayerDashboard does for mentors)
    if (!session.user || !session.user.email) {
      console.error('No user data in session:', session)
      alert('Cannot cancel: User information not found. Please refresh the page and try again.')
      return
    }

    const userEmail = session.user.email
    const finalUserName = session.user.full_name || session.user.email || 'User'

    try {
      // Cancel session via API (handles Google Calendar deletion)
      const cancelResponse = await fetch('/api/calendar/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })

      if (!cancelResponse.ok) {
        const errorData = await cancelResponse.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to cancel session')
      }

      // Grant credit to user for cancelled session
      try {
        console.log('💰 Attempting to grant credit to user:', session.user.id)
        const creditResponse = await fetch('/api/credits/grant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: session.user.id,
            sourceSessionId: sessionId,
            reason: 'mentor_cancellation',
          }),
        })

        if (!creditResponse.ok) {
          const errorData = await creditResponse.json().catch(() => ({ error: 'Unknown error' }))
          console.error('❌ Failed to grant credit:', errorData)
          if (errorData.details?.includes('does not exist')) {
            alert('⚠️ Credits table not found. Please run the SQL migration: supabase/session-credits-schema.sql')
          }
        } else {
          const creditData = await creditResponse.json()
          console.log('✅ Credit granted successfully:', creditData)
        }
      } catch (creditError) {
        console.error('❌ Exception granting credit:', creditError)
        // Don't fail the cancellation if credit grant fails
      }

      // Generate reschedule link (one-time use, secure)
      const rescheduleToken = crypto.randomUUID()
      const rescheduleLink = `${window.location.origin}/dashboard/calendar?reschedule=${rescheduleToken}&session=${sessionId}`

      // Send cancellation email with reschedule link
      try {
        console.log('Sending cancellation email to:', userEmail)
        const emailResponse = await fetch('/api/notifications/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'session_cancelled',
            email: userEmail,
            data: {
              mentorName: profile?.full_name || profile?.email || 'Mentor',
              userName: finalUserName,
              startTime: session.start_time,
              rescheduleLink: rescheduleLink,
            },
          }),
        })

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json()
          console.error('Failed to send cancellation email:', errorData)
          throw new Error('Failed to send cancellation email')
        } else {
          console.log('Cancellation email sent successfully to:', userEmail)
        }
      } catch (emailError) {
        console.error('Error sending cancellation email:', emailError)
        throw emailError // Re-throw so user knows email failed
      }

      // Reload sessions
      loadUpcomingSessions()
      alert('Session cancelled. The user has been notified via email with a reschedule link.')
    } catch (error: any) {
      console.error('Error cancelling session:', error)
      alert(error.message || 'Failed to cancel session')
    }
  }

  const handleFeedbackSubmitted = () => {
    loadSubmissions()
    setSelectedSubmission(null) // Close modal after submission
  }

  const handleSelectSubmission = (submission: FeedbackSubmission) => {
    setSelectedSubmission(submission)
  }

  const handleCloseFeedback = () => {
    setSelectedSubmission(null)
  }

  const getInitials = (name: string | null) => {
    if (!name) return 'M'
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name[0].toUpperCase()
  }

  // Consider feedback "new" if:
  // - Status is pending or assigned, OR
  // - Created within last 7 days (even if in progress)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  const newSubmissions = submissions.filter(s => {
    const isPendingOrAssigned = s.status === 'pending' || s.status === 'assigned'
    const isRecent = new Date(s.created_at) >= sevenDaysAgo
    return isPendingOrAssigned || isRecent
  })
  const pendingCount = newSubmissions.length
  const completedCount = submissions.filter(s => s.status === 'completed').length

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-[#272727] rounded w-1/3 animate-pulse"></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <CardSkeleton />
      </div>
    )
  }

  const displayName = profile?.full_name || profile?.email || 'there'
  const firstName = displayName !== 'there' ? displayName.split(' ')[0] : ''

  return (
    <>
    <div className="space-y-6 fade-in">
      {/* Personalized Overlay */}
      <div className="bg-gradient-to-r from-[#272727] to-black border border-[#272727] rounded-lg p-6 sm:p-8 dotted-bg-subtle">
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Profile Photo */}
          {profile?.profile_photo_url ? (
            <img
              src={profile.profile_photo_url}
              alt={profile?.full_name || 'Profile'}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover flex-shrink-0 border-2 border-[#ffc700]/40"
            />
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#ffc700]/20 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-[#ffc700]/40">
              <span className="text-2xl sm:text-3xl font-bold text-[#ffc700]">
                {getInitials(profile?.full_name || null)}
              </span>
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
              {firstName ? `Welcome back, ${firstName}!` : 'Welcome back!'}
            </h1>
            <p className="text-sm text-[#d9d9d9] mt-1">
              Professional Mentor Dashboard
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
          {/* New Submissions - Most Important */}
          {newSubmissions.slice(0, 3).length > 0 && (
            <div className="bg-gradient-to-r from-[#ffc700]/10 to-[#ffc700]/5 border-2 border-[#ffc700]/40 rounded-lg shadow-mvp p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#ffc700] rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white">New Submissions</h2>
                    <p className="text-sm text-[#d9d9d9]">{pendingCount} submission{pendingCount !== 1 ? 's' : ''} awaiting review</p>
                  </div>
                </div>
                <Link
                  href="/dashboard/feedback"
                  className="text-sm text-[#ffc700] hover:text-[#e6b300] transition"
                >
                  View All →
                </Link>
              </div>
              <SubmissionList
                submissions={newSubmissions.slice(0, 3)}
                userRole="mentor"
                onUpdate={loadSubmissions}
                onSelectSubmission={handleSelectSubmission}
              />
            </div>
          )}

          {/* Upcoming Sessions - Show next 3 */}
          {upcomingSessions.slice(0, 3).length > 0 && (
            <div className="bg-black border border-[#272727] rounded-lg shadow-mvp p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-white">Upcoming Sessions</h2>
                <Link
                  href="/dashboard/one-on-ones"
                  className="text-sm text-[#ffc700] hover:text-[#e6b300] transition"
                >
                  View All →
                </Link>
              </div>
              <div className="space-y-3">
                {upcomingSessions.slice(0, 3).map((session) => (
                  <div
                    key={session.id}
                    className="p-4 bg-[#272727]/50 border border-[#272727] rounded-lg hover:border-[#ffc700]/40 transition"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {session.user?.profile_photo_url ? (
                            <img
                              src={session.user.profile_photo_url}
                              alt={session.user?.full_name || session.user?.email || 'User'}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0 border-2 border-[#ffc700]/40"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-[#ffc700]/20 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-[#ffc700]/40">
                              <span className="text-sm font-bold text-[#ffc700]">
                                {getInitials(session.user?.full_name || null)}
                              </span>
                            </div>
                          )}
                          <h3 className="font-semibold text-white">
                            {session.user?.full_name || session.user?.email || 'Unknown User'}
                          </h3>
                        </div>
                        <p className="text-sm text-[#d9d9d9] mb-1">
                          {format(new Date(session.start_time), 'EEEE, MMMM d, yyyy')}
                        </p>
                        <p className="text-sm text-[#d9d9d9]">
                          {format(new Date(session.start_time), 'h:mm a')} - {format(new Date(session.end_time), 'h:mm a')}
                        </p>
                        <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${
                          session.status === 'confirmed'
                            ? 'bg-green-900/30 text-green-400 border border-green-800'
                            : 'bg-[#ffc700]/20 text-[#ffc700] border border-[#ffc700]/40'
                        }`}>
                          {session.status}
                        </span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-[#272727]">
                        <button
                          onClick={() => handleCancelSession(session.id, session)}
                          className="w-full px-3 py-2 bg-red-900/30 text-red-400 border border-red-800 rounded text-sm font-medium hover:bg-red-900/50 transition"
                        >
                          Cancel Session
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State - Show when nothing NEW */}
          {newSubmissions.length === 0 && upcomingSessions.length === 0 && (
            <div className="bg-black border border-[#272727] rounded-lg shadow-mvp p-12 text-center">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500/50" />
              <h3 className="text-lg font-semibold text-white mb-2">All Caught Up! 🎉</h3>
              <p className="text-[#d9d9d9] mb-6 max-w-md mx-auto">
                You're all set! No new submissions or upcoming sessions right now.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Feedback Form Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-black border-2 border-[#ffc700]/40 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8">
            <FeedbackForm
              submission={selectedSubmission}
              onSubmitted={handleFeedbackSubmitted}
              onCancel={handleCloseFeedback}
            />
          </div>
        </div>
      )}
    </>
  )
}
