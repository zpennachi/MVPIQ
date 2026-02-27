'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, BookOpen, LogOut, Menu, X, Settings, Lock, Shield, Users, School, UserCheck, MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import type { Profile } from '@/types/database'
import { Logo } from '@/components/ui/Logo'
import { getFullName } from '@/lib/utils'

export function Sidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [hasPaid, setHasPaid] = useState(false)
  const [newFeedbackCount, setNewFeedbackCount] = useState(0)
  const [newSessionsCount, setNewSessionsCount] = useState(0)
  const [upcomingAppointmentsCount, setUpcomingAppointmentsCount] = useState(0)
  const [oneOnOnesExpanded, setOneOnOnesExpanded] = useState(false)
  const [feedbackExpanded, setFeedbackExpanded] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        if (data) {
          setProfile(data as Profile)

          // Check payment status for players
          if (data.role === 'player') {
            const { data: payments } = await supabase
              .from('payments')
              .select('*')
              .eq('player_id', user.id)
              .eq('status', 'succeeded')
              .gte('amount', 5000)

            setHasPaid((payments?.length || 0) > 0)
          } else {
            // Non-players have access
            setHasPaid(true)
          }

          // Load notification counts for mentors
          if (data.role === 'mentor') {
            loadNotificationCounts(user.id)
          }

          // Load upcoming appointments count for all users
          if (data.role === 'player' || data.role === 'coach') {
            loadUpcomingAppointmentsCount(user.id)
          }

          // Auto-expand One-on-Ones submenu if on that page
          if (pathname?.startsWith('/dashboard/one-on-ones')) {
            setOneOnOnesExpanded(true)
          }
          // Auto-expand Feedback submenu if on that page
          if (pathname?.startsWith('/dashboard/feedback')) {
            setFeedbackExpanded(true)
          }
        }
      }
    }
    getUser()
  }, [])

  // Reload notification counts when navigating to/from relevant pages
  useEffect(() => {
    if (profile?.role === 'mentor' && user) {
      // Mark as seen when viewing feedback page
      if (pathname === '/dashboard/feedback') {
        markFeedbackAsSeen()
      }
      // Mark as seen when viewing one-on-ones page
      if (pathname === '/dashboard/one-on-ones') {
        markSessionsAsSeen()
      }
      // Reload counts periodically and on navigation
      const interval = setInterval(() => {
        loadNotificationCounts(user.id)
      }, 30000) // Every 30 seconds
      loadNotificationCounts(user.id)
      return () => clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, profile?.role, user])

  const loadNotificationCounts = async (mentorId: string) => {
    try {
      // Check for new feedback (pending/assigned or created within 7 days)
      // Exclude completed feedback - it should never show as "new"
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      // Query for pending/assigned OR recent (within 7 days)
      const { data: allFeedback } = await supabase
        .from('feedback_submissions')
        .select('id, status, created_at')

      // Filter on client side to find new feedback
      // Exclude completed submissions - they should never show as "new"
      const feedback = allFeedback?.filter(f => {
        // Exclude completed submissions
        if (f.status === 'completed') {
          return false
        }
        const isPendingOrAssigned = f.status === 'pending' || f.status === 'assigned'
        const isRecent = new Date(f.created_at) >= sevenDaysAgo
        return isPendingOrAssigned || isRecent
      })

      // Get seen feedback IDs from localStorage (only on client side)
      const seenFeedbackIds = typeof window !== 'undefined'
        ? JSON.parse(localStorage.getItem('seen_feedback_ids') || '[]')
        : []
      const unseenFeedback = feedback?.filter(f => !seenFeedbackIds.includes(f.id)) || []
      setNewFeedbackCount(unseenFeedback.length)

      // Check for new sessions (pending or confirmed, upcoming)
      const { data: sessions } = await supabase
        .from('booked_sessions')
        .select('id, status, created_at')
        .eq('mentor_id', mentorId)
        .in('status', ['pending', 'confirmed'])
        .gte('start_time', new Date().toISOString())

      // Get seen session IDs from localStorage (only on client side)
      const seenSessionIds = typeof window !== 'undefined'
        ? JSON.parse(localStorage.getItem('seen_session_ids') || '[]')
        : []
      const unseenSessions = sessions?.filter(s => !seenSessionIds.includes(s.id)) || []
      setNewSessionsCount(unseenSessions.length)
    } catch (error) {
      console.error('Error loading notification counts:', error)
    }
  }

  const markFeedbackAsSeen = async () => {
    try {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { data: allFeedback } = await supabase
        .from('feedback_submissions')
        .select('id, status, created_at')

      // Filter on client side to find new feedback
      // Exclude completed submissions - they should never show as "new"
      const feedback = allFeedback?.filter(f => {
        // Exclude completed submissions
        if (f.status === 'completed') {
          return false
        }
        const isPendingOrAssigned = f.status === 'pending' || f.status === 'assigned'
        const isRecent = new Date(f.created_at) >= sevenDaysAgo
        return isPendingOrAssigned || isRecent
      })

      if (feedback && typeof window !== 'undefined') {
        const seenIds = JSON.parse(localStorage.getItem('seen_feedback_ids') || '[]')
        const newSeenIds = [...new Set([...seenIds, ...feedback.map(f => f.id)])]
        localStorage.setItem('seen_feedback_ids', JSON.stringify(newSeenIds))
        setNewFeedbackCount(0)
      }
    } catch (error) {
      console.error('Error marking feedback as seen:', error)
    }
  }

  const markSessionsAsSeen = async () => {
    try {
      if (!user) return

      const { data: sessions } = await supabase
        .from('booked_sessions')
        .select('id')
        .eq('mentor_id', user.id)
        .in('status', ['pending', 'confirmed'])
        .gte('start_time', new Date().toISOString())

      if (sessions && typeof window !== 'undefined') {
        const seenIds = JSON.parse(localStorage.getItem('seen_session_ids') || '[]')
        const newSeenIds = [...new Set([...seenIds, ...sessions.map(s => s.id)])]
        localStorage.setItem('seen_session_ids', JSON.stringify(newSeenIds))
        setNewSessionsCount(0)
      }
    } catch (error) {
      console.error('Error marking sessions as seen:', error)
    }
  }

  const loadUpcomingAppointmentsCount = async (userId: string) => {
    try {
      const { count } = await supabase
        .from('booked_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['pending', 'confirmed'])
        .gte('start_time', new Date().toISOString())

      setUpcomingAppointmentsCount(count || 0)
    } catch (error) {
      console.error('Error loading upcoming appointments count:', error)
    }
  }

  // Reload upcoming appointments count when navigating
  useEffect(() => {
    if ((profile?.role === 'player' || profile?.role === 'coach') && user) {
      loadUpcomingAppointmentsCount(user.id)
      const interval = setInterval(() => {
        loadUpcomingAppointmentsCount(user.id)
      }, 30000) // Every 30 seconds
      return () => clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, profile?.role, user])

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (!user || !profile) return null

  const isActive = (path: string) => pathname === path

  const NavContent = () => (
    <>
      <div className="mb-8">
        <Logo height={36} variant="dark" />
      </div>

      <nav className="flex-1 space-y-2">
        <Link
          href="/dashboard"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${isActive('/dashboard') && !isActive('/dashboard/one-on-ones') && !isActive('/dashboard/feedback')
              ? 'bg-[#ffc700] text-black'
              : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
            }`}
        >
          <Home className="w-5 h-5" />
          <span className="font-medium">Home</span>
        </Link>

        {/* Player Navigation */}
        {profile.role === 'player' && (
          <>
            {/* One-on-Ones with submenu on desktop */}
            <div className="hidden lg:block">
              <button
                onClick={() => setOneOnOnesExpanded(!oneOnOnesExpanded)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${isActive('/dashboard/one-on-ones')
                    ? 'bg-[#ffc700] text-black'
                    : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5" />
                  <span className="font-medium">One-on-Ones</span>
                </div>
                <svg
                  className={`w-4 h-4 transition-transform ${oneOnOnesExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {oneOnOnesExpanded && (
                <div className="ml-8 mt-1 space-y-1">
                  <Link
                    href="/dashboard/one-on-ones?tab=book"
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-300 text-sm ${pathname === '/dashboard/one-on-ones' && searchParams?.get('tab') !== 'appointments'
                        ? 'bg-[#272727] text-[#ffc700]'
                        : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
                      }`}
                  >
                    <span>Book an Appointment</span>
                  </Link>
                  <Link
                    href="/dashboard/one-on-ones?tab=appointments"
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-300 text-sm relative ${pathname === '/dashboard/one-on-ones' && searchParams?.get('tab') === 'appointments'
                        ? 'bg-[#272727] text-[#ffc700]'
                        : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
                      }`}
                  >
                    <span>My Appointments</span>
                    {upcomingAppointmentsCount > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {upcomingAppointmentsCount > 9 ? '9+' : upcomingAppointmentsCount}
                      </span>
                    )}
                  </Link>
                </div>
              )}
            </div>
            {/* Mobile: Simple link */}
            <Link
              href="/dashboard/one-on-ones"
              className={`lg:hidden flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 relative ${isActive('/dashboard/one-on-ones')
                  ? 'bg-[#ffc700] text-black'
                  : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
                }`}
            >
              <Calendar className="w-5 h-5" />
              <span className="font-medium">One-on-Ones</span>
              {upcomingAppointmentsCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {upcomingAppointmentsCount > 9 ? '9+' : upcomingAppointmentsCount}
                </span>
              )}
            </Link>
            {/* Feedback with submenu on desktop */}
            <div className="hidden lg:block">
              <button
                onClick={() => setFeedbackExpanded(!feedbackExpanded)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${isActive('/dashboard/feedback')
                    ? 'bg-[#ffc700] text-black'
                    : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5" />
                  <span className="font-medium">Feedback</span>
                </div>
                <svg
                  className={`w-4 h-4 transition-transform ${feedbackExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {feedbackExpanded && (
                <div className="ml-8 mt-1 space-y-1">
                  <Link
                    href="/dashboard/feedback"
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-300 text-sm ${pathname === '/dashboard/feedback' && !pathname?.includes('/submit-video')
                        ? 'bg-[#272727] text-[#ffc700]'
                        : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
                      }`}
                  >
                    <span>My Feedback</span>
                  </Link>
                  <Link
                    href="/dashboard/feedback/submit-video"
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-300 text-sm ${pathname === '/dashboard/feedback/submit-video'
                        ? 'bg-[#272727] text-[#ffc700]'
                        : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
                      }`}
                  >
                    <span>Submit Video</span>
                  </Link>
                </div>
              )}
            </div>
            {/* Mobile: Simple link */}
            <Link
              href="/dashboard/feedback"
              className={`lg:hidden flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${isActive('/dashboard/feedback')
                  ? 'bg-[#ffc700] text-black'
                  : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
                }`}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="font-medium">Feedback</span>
            </Link>
          </>
        )}

        {/* Mentor Navigation */}
        {profile.role === 'mentor' && (
          <>
            <Link
              href="/dashboard/feedback"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 relative ${isActive('/dashboard/feedback')
                  ? 'bg-[#ffc700] text-black'
                  : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
                }`}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="font-medium">Feedback</span>
              {newFeedbackCount > 0 && (
                <span className="absolute right-2 top-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {newFeedbackCount > 9 ? '9+' : newFeedbackCount}
                </span>
              )}
            </Link>
            {/* One-on-Ones with submenu on desktop */}
            <div className="hidden lg:block">
              <button
                onClick={() => setOneOnOnesExpanded(!oneOnOnesExpanded)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${isActive('/dashboard/one-on-ones')
                    ? 'bg-[#ffc700] text-black'
                    : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
                  }`}
              >
                <div className="flex items-center gap-3 relative">
                  <Calendar className="w-5 h-5" />
                  <span className="font-medium">One-on-Ones</span>
                  {newSessionsCount > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {newSessionsCount > 9 ? '9+' : newSessionsCount}
                    </span>
                  )}
                </div>
                <svg
                  className={`w-4 h-4 transition-transform ${oneOnOnesExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {oneOnOnesExpanded && (
                <div className="ml-8 mt-1 space-y-1">
                  <Link
                    href="/dashboard/one-on-ones?tab=availability"
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-300 text-sm ${pathname === '/dashboard/one-on-ones' && searchParams?.get('tab') !== 'upcoming'
                        ? 'bg-[#272727] text-[#ffc700]'
                        : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
                      }`}
                  >
                    <span>Availability</span>
                  </Link>
                  <Link
                    href="/dashboard/one-on-ones?tab=upcoming"
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-300 text-sm ${pathname === '/dashboard/one-on-ones' && searchParams?.get('tab') === 'upcoming'
                        ? 'bg-[#272727] text-[#ffc700]'
                        : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
                      }`}
                  >
                    <span>Upcoming Appointments</span>
                  </Link>
                </div>
              )}
            </div>
            {/* Mobile: Simple link */}
            <Link
              href="/dashboard/one-on-ones"
              className={`lg:hidden flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 relative ${isActive('/dashboard/one-on-ones')
                  ? 'bg-[#ffc700] text-black'
                  : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
                }`}
            >
              <Calendar className="w-5 h-5" />
              <span className="font-medium">One-on-Ones</span>
              {newSessionsCount > 0 && (
                <span className="absolute right-2 top-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {newSessionsCount > 9 ? '9+' : newSessionsCount}
                </span>
              )}
            </Link>
          </>
        )}

        {/* Coach Navigation */}
        {profile.role === 'coach' && (
          <>
            {/* One-on-Ones with submenu on desktop */}
            <div className="hidden lg:block">
              <button
                onClick={() => setOneOnOnesExpanded(!oneOnOnesExpanded)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${isActive('/dashboard/one-on-ones')
                    ? 'bg-[#ffc700] text-black'
                    : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5" />
                  <span className="font-medium">One-on-Ones</span>
                </div>
                <svg
                  className={`w-4 h-4 transition-transform ${oneOnOnesExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {oneOnOnesExpanded && (
                <div className="ml-8 mt-1 space-y-1">
                  <Link
                    href="/dashboard/one-on-ones?tab=book"
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-300 text-sm ${pathname === '/dashboard/one-on-ones' && searchParams?.get('tab') !== 'appointments'
                        ? 'bg-[#272727] text-[#ffc700]'
                        : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
                      }`}
                  >
                    <span>Book an Appointment</span>
                  </Link>
                  <Link
                    href="/dashboard/one-on-ones?tab=appointments"
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-300 text-sm relative ${pathname === '/dashboard/one-on-ones' && searchParams?.get('tab') === 'appointments'
                        ? 'bg-[#272727] text-[#ffc700]'
                        : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
                      }`}
                  >
                    <span>My Appointments</span>
                    {upcomingAppointmentsCount > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {upcomingAppointmentsCount > 9 ? '9+' : upcomingAppointmentsCount}
                      </span>
                    )}
                  </Link>
                </div>
              )}
            </div>
            {/* Mobile: Simple link */}
            <Link
              href="/dashboard/one-on-ones"
              className={`lg:hidden flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 relative ${isActive('/dashboard/one-on-ones')
                  ? 'bg-[#ffc700] text-black'
                  : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
                }`}
            >
              <Calendar className="w-5 h-5" />
              <span className="font-medium">One-on-Ones</span>
              {upcomingAppointmentsCount > 0 && (
                <span className="absolute right-2 top-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {upcomingAppointmentsCount > 9 ? '9+' : upcomingAppointmentsCount}
                </span>
              )}
            </Link>
            {/* Feedback with submenu on desktop */}
            <div className="hidden lg:block">
              <button
                onClick={() => setFeedbackExpanded(!feedbackExpanded)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${isActive('/dashboard/feedback')
                    ? 'bg-[#ffc700] text-black'
                    : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5" />
                  <span className="font-medium">Feedback</span>
                </div>
                <svg
                  className={`w-4 h-4 transition-transform ${feedbackExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {feedbackExpanded && (
                <div className="ml-8 mt-1 space-y-1">
                  <Link
                    href="/dashboard/feedback"
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-300 text-sm ${pathname === '/dashboard/feedback' && !pathname?.includes('/submit-video')
                        ? 'bg-[#272727] text-[#ffc700]'
                        : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
                      }`}
                  >
                    <span>My Feedback</span>
                  </Link>
                  <Link
                    href="/dashboard/feedback/submit-video"
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-300 text-sm ${pathname === '/dashboard/feedback/submit-video'
                        ? 'bg-[#272727] text-[#ffc700]'
                        : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
                      }`}
                  >
                    <span>Submit Video</span>
                  </Link>
                </div>
              )}
            </div>
            {/* Mobile: Simple link */}
            <Link
              href="/dashboard/feedback"
              className={`lg:hidden flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${isActive('/dashboard/feedback')
                  ? 'bg-[#ffc700] text-black'
                  : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
                }`}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="font-medium">Feedback</span>
            </Link>
          </>
        )}

        {/* Education - Hidden for admins (they have admin/education instead) */}
        {profile.role !== 'admin' && (
          profile.role === 'player' && !hasPaid ? (
            <div
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 opacity-50 cursor-not-allowed ${isActive('/dashboard/education')
                  ? 'bg-[#272727] text-[#d9d9d9]'
                  : 'text-[#d9d9d9]'
                }`}
              title="Complete a $50 payment to unlock Education content"
            >
              <Lock className="w-5 h-5" />
              <span className="font-medium">Education</span>
            </div>
          ) : (
            <Link
              href="/dashboard/education"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${isActive('/dashboard/education')
                  ? 'bg-[#ffc700] text-black'
                  : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
                }`}
            >
              <BookOpen className="w-5 h-5" />
              <span className="font-medium">Education</span>
            </Link>
          )
        )}

        <Link
          href="/dashboard/settings"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${isActive('/dashboard/settings')
              ? 'bg-[#ffc700] text-black'
              : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
            }`}
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">Settings</span>
        </Link>

        {profile.role === 'admin' && (
          <>
            <div className="pt-4 mt-4 border-t border-[#272727]">
              <p className="px-4 py-2 text-xs font-semibold text-[#d9d9d9]/70 uppercase tracking-wider">Admin</p>
            </div>
            <Link
              href="/dashboard/admin"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${isActive('/dashboard/admin') && !isActive('/dashboard/admin/users') && !isActive('/dashboard/admin/teams') && !isActive('/dashboard/admin/mentors') && !isActive('/dashboard/admin/education') && !isActive('/dashboard/admin/homepage')
                  ? 'bg-[#ffc700] text-black'
                  : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
                }`}
            >
              <Shield className="w-5 h-5" />
              <span className="font-medium">Admin Dashboard</span>
            </Link>
            <Link
              href="/dashboard/admin/users"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${isActive('/dashboard/admin/users')
                  ? 'bg-[#ffc700] text-black'
                  : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
                }`}
            >
              <Users className="w-5 h-5" />
              <span className="font-medium">Users</span>
            </Link>
            {/* Temporarily hidden until client is ready
            <Link
              href="/dashboard/admin/teams"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                isActive('/dashboard/admin/teams')
                  ? 'bg-[#ffc700] text-black'
                  : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
              }`}
            >
              <School className="w-5 h-5" />
              <span className="font-medium">Teams</span>
            </Link>
            */}
            <Link
              href="/dashboard/admin/mentors"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${isActive('/dashboard/admin/mentors')
                  ? 'bg-[#ffc700] text-black'
                  : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
                }`}
            >
              <UserCheck className="w-5 h-5" />
              <span className="font-medium">Mentors</span>
            </Link>
            <Link
              href="/dashboard/admin/education"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${isActive('/dashboard/admin/education')
                  ? 'bg-[#ffc700] text-black'
                  : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
                }`}
            >
              <BookOpen className="w-5 h-5" />
              <span className="font-medium">Education</span>
            </Link>
          </>
        )}
      </nav>

      <div className="mt-auto pt-6 border-t border-[#272727]">
        <div className="px-4 py-2 mb-4">
          <p className="text-sm text-[#d9d9d9]">{getFullName(profile) || profile.email}</p>
          <p className="text-xs text-[#d9d9d9]/70 capitalize">{profile.role}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[#d9d9d9] hover:bg-[#272727] hover:text-white transition-all duration-300 active:scale-95"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Menu Button - Right Side */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-black border border-[#272727] rounded-lg text-[#ffc700] hover:bg-[#272727] transition-all duration-300 active:scale-95"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-70 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Hidden on mobile, shown on desktop */}
      <aside className="hidden lg:flex w-64 bg-black border-r border-[#272727] min-h-screen p-6 flex-col fixed left-0 top-0">
        <NavContent />
      </aside>

      {/* Mobile Menu - Slides in from left */}
      <aside
        className={`lg:hidden fixed left-0 top-0 h-full w-64 bg-black border-r border-[#272727] p-6 flex flex-col z-50 transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <NavContent />
      </aside>
    </>
  )
}
