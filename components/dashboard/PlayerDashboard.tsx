'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SubmissionList } from '@/components/feedback/SubmissionList'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import type { FeedbackSubmission, Profile } from '@/types/database'
import { MessageSquare, Users, DollarSign, HelpCircle, Video } from 'lucide-react'
import Link from 'next/link'
import { getFullName, getFirstName, getInitials as getProfileInitials } from '@/lib/utils'

interface PlayerDashboardProps {
  userId: string
}

export function PlayerDashboard({ userId }: PlayerDashboardProps) {
  const [submissions, setSubmissions] = useState<FeedbackSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<{ team: { id: string; name: string }; player_number: string | null }[]>([])
  const [profile, setProfile] = useState<{ first_name: string | null; last_name: string | null; email: string; profile_photo_url: string | null } | null>(null)
  const [hasPaid, setHasPaid] = useState(false)
  const [oneOnOnes, setOneOnOnes] = useState<any[]>([])
  const [availableCredits, setAvailableCredits] = useState(0)
  const [viewedFeedbackIds, setViewedFeedbackIds] = useState<Set<string>>(new Set())
  const supabase = createClient()

  // Load viewed feedback IDs from server
  useEffect(() => {
    const loadViewedFeedback = async () => {
      const { data: viewedData } = await supabase
        .from('viewed_feedback')
        .select('submission_id')
        .eq('user_id', userId)

      if (viewedData) {
        setViewedFeedbackIds(new Set(viewedData.map(v => v.submission_id)))
      }
    }
    loadViewedFeedback()
  }, [userId, supabase])

  // Mark feedback as viewed (server-side)
  const markFeedbackAsViewed = async (submissionId: string) => {
    // Optimistically update UI
    const newViewed = new Set(viewedFeedbackIds)
    newViewed.add(submissionId)
    setViewedFeedbackIds(newViewed)

    // Mark as viewed on server
    try {
      await fetch('/api/feedback/mark-viewed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId }),
      })
    } catch (error) {
      console.error('Error marking feedback as viewed:', error)
      // Revert optimistic update on error
      newViewed.delete(submissionId)
      setViewedFeedbackIds(new Set(viewedFeedbackIds))
    }
  }

  useEffect(() => {
    loadData()
    checkPaymentStatus()
    loadOneOnOnes()
    checkCredits()
    
    // Refresh appointments when page becomes visible (user returns from booking)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadOneOnOnes()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Also refresh on focus (user switches back to tab)
    const handleFocus = () => {
      loadOneOnOnes()
    }
    
    window.addEventListener('focus', handleFocus)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [userId])

  const checkCredits = async () => {
    try {
      const response = await fetch('/api/credits/check')
      if (response.ok) {
        const data = await response.json()
        setAvailableCredits(data.availableCredits || 0)
      }
    } catch (error) {
      console.error('Error checking credits:', error)
    }
  }

  useEffect(() => {
    // Check for payment success in URL
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('video_payment') === 'success') {
      // Remove query param and refresh data
      window.history.replaceState({}, '', '/dashboard')
      loadData()
      alert('Payment successful! Your video has been uploaded.')
    }
  }, [])

  useEffect(() => {
    const loadProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, profile_photo_url')
        .eq('id', userId)
        .single()
      if (data) setProfile(data)
    }
    loadProfile()
  }, [userId])

  const checkPaymentStatus = async () => {
    // Check if user has any videos with 'ready' status (which means payment was completed)
    // or any successful payment of $50 or more
    const { count: readyVideos } = await supabase
      .from('videos')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', userId)
      .eq('status', 'ready')

    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('player_id', userId)
      .eq('status', 'succeeded')
      .gte('amount', 5000) // $50 in cents

    setHasPaid((readyVideos || 0) > 0 || (payments?.length || 0) > 0)
  }

  const loadOneOnOnes = async () => {
    const { data } = await supabase
      .from('booked_sessions')
      .select(`
        *,
        mentor:profiles!booked_sessions_mentor_id_fkey(*)
      `)
      .eq('user_id', userId)
      .in('status', ['pending', 'confirmed'])
      .order('start_time', { ascending: true })

    if (data) setOneOnOnes(data)
  }

  const loadData = async () => {
    setLoading(true)
    
    // Load submissions and viewed feedback in parallel
    const [submissionsResult, viewedResult] = await Promise.all([
      supabase
        .from('feedback_submissions')
        .select(`
          *,
          videos(*),
          mentor:profiles!feedback_submissions_mentor_id_fkey(id, first_name, last_name, email, profile_photo_url)
        `)
      .eq('player_id', userId)
      .order('created_at', { ascending: false }),
      supabase
        .from('viewed_feedback')
        .select('submission_id')
        .eq('user_id', userId)
    ])

    if (submissionsResult.data) {
      setSubmissions(submissionsResult.data as FeedbackSubmission[])
    }
    
    if (viewedResult.data) {
      setViewedFeedbackIds(new Set(viewedResult.data.map(v => v.submission_id)))
    }

    // Load team memberships
    const { data: teamMembersData } = await supabase
      .from('team_members')
      .select(`
        player_number,
        team:teams(id, name)
      `)
      .eq('player_id', userId)

    if (teamMembersData) {
      const teamsList = teamMembersData
        .filter(tm => {
          const team = tm.team
          return team && !Array.isArray(team) && typeof team === 'object' && 'id' in team && 'name' in team
        })
        .map(tm => {
          const team = Array.isArray(tm.team) ? tm.team[0] : tm.team
          return {
            team: team as { id: string; name: string },
            player_number: tm.player_number,
          }
        })
      setTeams(teamsList)
    }

    setLoading(false)
  }


  const displayName = getFullName(profile) || 'there'
  const firstName = getFirstName(profile) || ''
  const playerNumber = teams.length > 0 ? teams[0].player_number : null
  const schoolName = teams.length > 0 ? teams[0].team.name : null

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

  return (
    <div className="space-y-6 fade-in">
      {/* Personalized Overlay */}
      <div className="bg-gradient-to-r from-[#272727] to-black border border-[#272727] rounded-lg p-6 sm:p-8 fade-in-delay-1 dotted-bg-subtle">
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
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2">
              {playerNumber && (
                <div className="flex items-center gap-2 text-[#d9d9d9]">
                  <span className="text-sm font-medium">#{playerNumber}</span>
                </div>
              )}
              {schoolName && (
                <div className="flex items-center gap-2 text-[#d9d9d9]">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">{schoolName}</span>
                </div>
              )}
              {availableCredits > 0 && (
                <div className="flex items-center gap-2 bg-green-600/20 border border-green-500/40 rounded-lg px-3 py-1.5">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium text-green-400">
                    {availableCredits} Session Credit{availableCredits > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
          {/* Upcoming Appointments - Show FIRST */}
          {oneOnOnes.slice(0, 3).length > 0 && (
            <div className="bg-black border border-[#272727] rounded-lg shadow-mvp p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-white">Upcoming Appointments</h2>
                <Link
                  href="/dashboard/one-on-ones"
                  className="text-sm text-[#ffc700] hover:text-[#e6b300] transition"
                >
                  View All →
                </Link>
              </div>
              <div className="space-y-3">
                {oneOnOnes.slice(0, 3).map((session: any) => {
                  const mentor = session.mentor as any
                  const getMentorInitials = (name: string | null) => {
                    if (!name) return 'M'
                    const parts = name.split(' ')
                    if (parts.length >= 2) {
                      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
                    }
                    return name[0].toUpperCase()
                  }

                  return (
                    <div
                      key={session.id}
                      className="p-4 bg-[#272727]/50 border border-[#272727] rounded-lg hover:border-[#ffc700]/40 transition-all duration-300"
                    >
                      <div className="flex items-start gap-4">
                        {mentor?.profile_photo_url ? (
                          <img
                            src={mentor.profile_photo_url}
                            alt={getFullName(mentor) || 'Mentor'}
                            className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-[#ffc700]/40"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-[#ffc700]/20 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-[#ffc700]/40">
                            <span className="text-lg font-bold text-[#ffc700]">
                              {getProfileInitials(mentor as Profile)}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          {mentor && (
                            <p className="text-sm font-semibold text-[#ffc700] mb-1">
                              {getFullName(mentor) || mentor.email || 'Mentor'}
                            </p>
                          )}
                          <p className="text-sm text-white">
                            {new Date(session.start_time).toLocaleDateString('en-US', {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </p>
                          {session.meeting_link && (
                            <a
                              href={session.meeting_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-[#ffc700] text-black rounded-md hover:bg-[#e6b300] transition font-medium text-sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Video className="w-4 h-4" />
                              Join Meeting
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-[#272727]">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 text-[#ffc700] hover:text-[#e6b300] text-sm font-medium transition"
                >
                  <HelpCircle className="w-4 h-4" />
                  Need help with your session?
                </Link>
              </div>
            </div>
          )}

          {/* New Feedback - Show completed feedback that hasn't been viewed yet */}
          {submissions.filter(s => s.status === 'completed' && s.feedback_text && !viewedFeedbackIds.has(s.id)).length > 0 && (
            <div className="bg-gradient-to-r from-green-900/30 to-green-800/20 border-2 border-green-500/60 rounded-lg shadow-mvp p-4 sm:p-6 relative overflow-hidden">
              {/* Subtle animation background */}
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent opacity-50"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-green-500/40">
                      <MessageSquare className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                        🎉 New Feedback Available!
                      </h2>
                      <p className="text-sm text-green-300/90 mt-1 font-medium">
                        {submissions.filter(s => s.status === 'completed' && s.feedback_text && !viewedFeedbackIds.has(s.id)).length} new feedback response{submissions.filter(s => s.status === 'completed' && s.feedback_text && !viewedFeedbackIds.has(s.id)).length > 1 ? 's' : ''} ready for review
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/dashboard/feedback"
                    className="text-sm text-green-400 hover:text-green-300 transition font-medium whitespace-nowrap bg-green-500/10 px-3 py-1.5 rounded-md border border-green-500/30 hover:bg-green-500/20"
                  >
                    View All →
                  </Link>
                </div>
                <SubmissionList 
                  submissions={submissions.filter(s => s.status === 'completed' && s.feedback_text && !viewedFeedbackIds.has(s.id)).slice(0, 3)} 
                  userRole="player" 
                  onUpdate={loadData}
                  onViewFeedback={(submissionId) => markFeedbackAsViewed(submissionId)}
                />
              </div>
            </div>
          )}

          {/* Under Review Feedback - Show feedback that's being reviewed */}
          {submissions.filter(s => s.status !== 'completed').length > 0 && (
            <div className="bg-gradient-to-r from-[#ffc700]/10 to-[#ffc700]/5 border-2 border-[#ffc700]/40 rounded-lg shadow-mvp p-4 sm:p-6 relative overflow-hidden">
              {/* Subtle animation background */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#ffc700]/5 to-transparent opacity-50"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#ffc700]/20 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-[#ffc700]/40">
                      <MessageSquare className="w-6 h-6 text-[#ffc700]" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                        📹 Under Review
                      </h2>
                      <p className="text-sm text-[#ffc700]/90 mt-1 font-medium">
                        {submissions.filter(s => s.status !== 'completed').length} video{submissions.filter(s => s.status !== 'completed').length > 1 ? 's' : ''} being reviewed by professional mentors
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/dashboard/feedback"
                    className="text-sm text-[#ffc700] hover:text-[#e6b300] transition font-medium whitespace-nowrap bg-[#ffc700]/10 px-3 py-1.5 rounded-md border border-[#ffc700]/30 hover:bg-[#ffc700]/20"
                  >
                    View All →
                  </Link>
                </div>
                <SubmissionList 
                  submissions={submissions.filter(s => s.status !== 'completed').slice(0, 3)} 
                  userRole="player" 
                  onUpdate={loadData}
                />
              </div>
            </div>
          )}

          {/* Empty State - Show when no appointments, no new feedback, and no under review */}
          {oneOnOnes.length === 0 &&
           submissions.filter(s => s.status === 'completed' && s.feedback_text && !viewedFeedbackIds.has(s.id)).length === 0 &&
           submissions.filter(s => s.status !== 'completed').length === 0 && (
            <div className="bg-black border border-[#272727] rounded-lg shadow-mvp p-12 text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-[#272727]" />
              <h3 className="text-lg font-semibold text-white mb-2">Welcome to your dashboard!</h3>
              <p className="text-[#d9d9d9] mb-6 max-w-md mx-auto">
                Get started by booking a one-on-one session or submitting feedback
              </p>
              <div className="flex gap-3 justify-center">
                <Link
                  href="/dashboard/one-on-ones"
                  className="px-4 py-2 bg-[#ffc700] text-black rounded-md hover:bg-[#e6b300] transition font-medium"
                >
                  Book Session
                </Link>
                <Link
                  href="/dashboard/feedback"
                  className="px-4 py-2 bg-[#272727] text-white rounded-md hover:bg-[#272727]/80 transition font-medium"
                >
                  Submit Feedback
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
  )
}
