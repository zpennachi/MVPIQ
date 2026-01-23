'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SubmissionList } from '@/components/feedback/SubmissionList'
import { FeedbackForm } from '@/components/feedback/FeedbackForm'
import { MentorAvailability } from '@/components/calendar/MentorAvailability'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import type { FeedbackSubmission, BookedSession, Profile } from '@/types/database'
import { MessageSquare, CheckCircle, Clock, User, Calendar, X, Film } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import { getFullName, getFirstName, getInitials as getProfileInitials } from '@/lib/utils'

interface MentorDashboardProps {
  mentorId: string
}

export function MentorDashboard({ mentorId }: MentorDashboardProps) {
  const [submissions, setSubmissions] = useState<FeedbackSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSubmission, setSelectedSubmission] = useState<FeedbackSubmission | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [upcomingSessions, setUpcomingSessions] = useState<(BookedSession & { user?: Profile })[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [viewedSubmissionIds, setViewedSubmissionIds] = useState<Set<string>>(new Set())
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null)
  const [connectingCalendar, setConnectingCalendar] = useState(false)
  const supabase = createClient()

  const connectGoogleCalendar = useCallback(async () => {
    if (connectingCalendar) return
    
    setConnectingCalendar(true)
    try {
      // Get OAuth URL from API
      const response = await fetch('/api/calendar/oauth/connect')
      const data = await response.json()
      
      if (data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl
      } else {
        console.error('Failed to get OAuth URL:', data.error)
        setConnectingCalendar(false)
      }
    } catch (error: any) {
      console.error('Error connecting calendar:', error)
      setConnectingCalendar(false)
    }
  }, [connectingCalendar])

  useEffect(() => {
    const loadProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', mentorId)
        .single()
      if (data) {
        setProfile(data)
        setCalendarConnected(data.google_calendar_connected || false)
        
        // If calendar not connected, automatically trigger OAuth flow
        if (!data.google_calendar_connected && !connectingCalendar) {
          connectGoogleCalendar()
        } else if (data.google_calendar_connected) {
          // If already connected, refresh tokens on login
          refreshOAuthTokens()
        }
      }
    }
    loadProfile()
  }, [mentorId, connectingCalendar, connectGoogleCalendar, supabase])

  const refreshOAuthTokens = async () => {
    try {
      // Silently refresh OAuth tokens - don't show errors to user
      const response = await fetch('/api/calendar/oauth/refresh', {
        method: 'POST',
      })
      const result = await response.json()
      
      if (result.success) {
        console.log('✅ OAuth tokens refreshed automatically on login')
      } else {
        // Only log, don't show error - user can manually reconnect if needed
        console.log('OAuth token refresh skipped:', result.message)
      }
    } catch (error) {
      // Silently fail - don't interrupt user experience
      console.log('OAuth token refresh failed silently:', error)
    }
  }

  // Load viewed submission IDs from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const viewed = localStorage.getItem(`viewed_submissions_${mentorId}`)
      if (viewed) {
        setViewedSubmissionIds(new Set(JSON.parse(viewed)))
      }
    }
  }, [mentorId])

  useEffect(() => {
    loadSubmissions()
  }, [mentorId])

  useEffect(() => {
    loadUpcomingSessions()
  }, [mentorId])

  // Reload profile after OAuth callback (check URL params)
  useEffect(() => {
    const checkOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('calendar_connected') === 'success') {
        // Reload profile to get updated calendar status
        const { data } = await supabase
          .from('profiles')
          .select('google_calendar_connected')
          .eq('id', mentorId)
          .single()
        if (data) {
          setCalendarConnected(data.google_calendar_connected || false)
        }
        // Clean up URL
        window.history.replaceState({}, '', '/dashboard')
      }
    }
    checkOAuthCallback()
  }, [mentorId, supabase])

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
      // Get sessions with user profile data in one query (like MyAppointments does)
      const { data: sessions, error: sessionsError } = await supabase
        .from('booked_sessions')
        .select(`
          *,
          user:profiles!booked_sessions_user_id_fkey(id, first_name, last_name, email, profile_photo_url)
        `)
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
        console.log('No upcoming sessions found for mentor:', mentorId)
        setUpcomingSessions([])
        return
      }

      // Sessions already have user data from the join query
      console.log('Loaded upcoming sessions:', sessions.length, sessions)
      setUpcomingSessions(sessions as any)
    } catch (error) {
      console.error('Unexpected error loading sessions:', error)
      setUpcomingSessions([])
    } finally {
      setLoadingSessions(false)
    }
  }

  const handleCancelSession = async (sessionId: string, session: BookedSession & { user?: Profile }) => {
    const userName = getFullName(session.user) || session.user?.email || 'the user'
    if (!confirm(`Are you sure you want to cancel this session with ${userName}?`)) {
      return
    }

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
      if (session.user?.id) {
        try {
          await fetch('/api/credits/grant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: session.user.id,
              sourceSessionId: sessionId,
              reason: 'mentor_cancellation',
            }),
          })
        } catch (creditError) {
          console.error('Error granting credit:', creditError)
        }
      }

      // Send cancellation email
      if (session.user?.email) {
        try {
          await fetch('/api/notifications/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'session_cancelled',
              email: session.user.email,
              data: {
                mentorName: getFullName(profile) || profile?.email || 'Mentor',
                userName: getFullName(session.user) || session.user.email || 'User',
                startTime: session.start_time,
              },
            }),
          })
        } catch (emailError) {
          console.error('Error sending cancellation email:', emailError)
        }
      }

      // Reload sessions
      loadUpcomingSessions()
      
      // Dispatch custom event to notify other components (like MyAppointments)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sessionCancelled', { detail: { sessionId } }))
      }
      
      alert('Session cancelled. The user has been notified via email.')
    } catch (error: any) {
      console.error('Error cancelling session:', error)
      alert(error.message || 'Failed to cancel session')
    }
  }

  const handleFeedbackSubmitted = () => {
    // Mark submission as viewed when feedback is provided
    // Also mark ALL completed submissions as viewed so they don't show as "new"
    if (selectedSubmission?.id) {
      const newViewed = new Set(viewedSubmissionIds)
      newViewed.add(selectedSubmission.id)
      
      // Mark all completed submissions as viewed so they don't show as "new"
      submissions
        .filter(s => s.status === 'completed')
        .forEach(s => newViewed.add(s.id))
      
      setViewedSubmissionIds(newViewed)
      if (typeof window !== 'undefined') {
        localStorage.setItem(`viewed_submissions_${mentorId}`, JSON.stringify(Array.from(newViewed)))
      }
    }
    loadSubmissions() // This will refresh and remove completed submissions from "New Submissions"
    setSelectedSubmission(null) // Close modal after submission
  }

  const handleSelectSubmission = (submission: FeedbackSubmission) => {
    setSelectedSubmission(submission)
  }

  const handleCloseFeedback = () => {
    setSelectedSubmission(null)
  }


  // Consider feedback "new" if:
  // - Status is pending or assigned, OR
  // - Created within last 7 days (even if in progress)
  // AND it hasn't been viewed yet
  // AND it's NOT completed (completed feedback should never show as new)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  const newSubmissions = submissions.filter(s => {
    // Exclude completed submissions - they should never show as "new"
    if (s.status === 'completed') {
      return false
    }
    
    // Exclude if already viewed
    if (viewedSubmissionIds.has(s.id)) {
      return false
    }
    
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

  const displayName = getFullName(profile) || profile?.email || 'there'
  const firstName = getFirstName(profile) || ''

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
              alt={getFullName(profile) || 'Profile'}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover flex-shrink-0 border-2 border-[#ffc700]/40"
            />
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#ffc700]/20 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-[#ffc700]/40">
              <span className="text-2xl sm:text-3xl font-bold text-[#ffc700]">
                {getProfileInitials(profile)}
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
                              alt={getFullName(session.user) || session.user?.email || 'User'}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0 border-2 border-[#ffc700]/40"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-[#ffc700]/20 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-[#ffc700]/40">
                              <span className="text-sm font-bold text-[#ffc700]">
                                {getProfileInitials(session.user || null)}
                              </span>
                            </div>
                          )}
                          <h3 className="font-semibold text-white">
                            {getFullName(session.user) || session.user?.email || 'Unknown User'}
                          </h3>
                        </div>
                        <p className="text-sm text-[#d9d9d9] mb-1">
                          {format(new Date(session.start_time), 'EEEE, MMMM d, yyyy')}
                        </p>
                        <p className="text-sm text-[#d9d9d9]">
                          {format(new Date(session.start_time), 'h:mm a')} - {format(new Date(session.end_time), 'h:mm a')}
                        </p>
                        {session.meeting_link && (
                          <a
                            href={session.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition"
                          >
                            <Calendar className="w-4 h-4" />
                            Join Meeting
                          </a>
                        )}
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
