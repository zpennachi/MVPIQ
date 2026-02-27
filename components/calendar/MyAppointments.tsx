'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { BookedSession, Profile } from '@/types/database'
import { Calendar, Video } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import Link from 'next/link'
import { getFullName, getInitials as getProfileInitials } from '@/lib/utils'

interface MyAppointmentsProps {
  userId: string
  userRole?: 'player' | 'coach' | 'mentor' | 'admin'
}

export function MyAppointments({ userId, userRole }: MyAppointmentsProps) {
  const [appointments, setAppointments] = useState<(BookedSession & { mentor?: Profile; user?: Profile })[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  
  // Determine if this is a mentor view
  const isMentorView = userRole === 'mentor'

  useEffect(() => {
    loadAppointments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isMentorView])

  // Also reload when component mounts (for refreshKey changes)
  useEffect(() => {
    loadAppointments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Listen for session cancellation events from other components (like MentorDashboard)
  useEffect(() => {
    const handleSessionCancelled = () => {
      // Reload appointments when a session is cancelled elsewhere
      loadAppointments()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('sessionCancelled', handleSessionCancelled)
      return () => {
        window.removeEventListener('sessionCancelled', handleSessionCancelled)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadAppointments = async () => {
    setLoading(true)

    let query = supabase
      .from('booked_sessions')
      .select(`
        *,
        mentor:profiles!booked_sessions_mentor_id_fkey(id, first_name, last_name, email, profile_photo_url),
        user:profiles!booked_sessions_user_id_fkey(id, first_name, last_name, email, profile_photo_url)
      `)
      .in('status', ['pending', 'confirmed'])
      .order('start_time', { ascending: true })

    // If mentor view, filter by mentor_id; otherwise filter by user_id
    if (isMentorView) {
      query = query.eq('mentor_id', userId)
    } else {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error loading appointments:', error)
    } else {
      setAppointments((data as any) || [])
    }
    setLoading(false)
  }

  const formatTime = (dateString: string) => {
    return format(parseISO(dateString), 'h:mm a')
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500 dark:text-gray-400">Loading appointments...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="dotted-bg-subtle rounded-lg p-4 -m-4 sm:-m-6 lg:-m-8 mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 dark:text-yellow-400" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">My Appointments</h1>
        </div>
      </div>

      {appointments.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-base sm:text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            All Upcoming Appointments
          </h2>
          <div className="space-y-3">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {format(parseISO(apt.start_time), 'PPp')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <strong>{isMentorView ? 'Client:' : 'Mentor:'}</strong>
                      {(isMentorView ? apt.user : apt.mentor)?.profile_photo_url ? (
                        <img
                          src={(isMentorView ? apt.user : apt.mentor)?.profile_photo_url || ''}
                          alt={getFullName((isMentorView ? apt.user : apt.mentor)) || (isMentorView ? 'Client' : 'Mentor')}
                          className="w-6 h-6 rounded-full object-cover border border-gray-300 dark:border-gray-600"
                        />
                      ) : (
                        <div className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center border border-gray-300 dark:border-gray-600">
                          <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">
                            {getProfileInitials((isMentorView ? apt.user : apt.mentor))}
                          </span>
                        </div>
                      )}
                      <span>{getFullName((isMentorView ? apt.user : apt.mentor)) || (isMentorView ? apt.user : apt.mentor)?.email || (isMentorView ? 'Client' : 'Mentor')}</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <strong>Duration:</strong> {formatTime(apt.start_time)} - {formatTime(apt.end_time)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <strong>Status:</strong> <span className="capitalize">{apt.status}</span>
                    </div>
                    {apt.meeting_link && (
                      <a
                        href={apt.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-yellow-500 hover:text-yellow-600 dark:text-yellow-400 dark:hover:text-yellow-300 text-sm mt-2"
                      >
                        <Video className="w-4 h-4" />
                        Join Meeting
                      </a>
                    )}
                    {isMentorView && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <button
                          onClick={async () => {
                            const userName = getFullName(apt.user) || apt.user?.email || 'the user'
                            if (!confirm(`Are you sure you want to cancel this session with ${userName}?`)) {
                              return
                            }

                            try {
                              // Cancel session via API (handles Google Calendar deletion)
                              const cancelResponse = await fetch('/api/calendar/cancel', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ sessionId: apt.id }),
                              })

                              if (!cancelResponse.ok) {
                                const errorData = await cancelResponse.json().catch(() => ({ error: 'Unknown error' }))
                                throw new Error(errorData.error || 'Failed to cancel session')
                              }

                              // Grant credit to user for cancelled session
                              if (apt.user?.id) {
                                try {
                                  await fetch('/api/credits/grant', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      userId: apt.user.id,
                                      sourceSessionId: apt.id,
                                      reason: 'mentor_cancellation',
                                    }),
                                  })
                                } catch (creditError) {
                                  console.error('Error granting credit:', creditError)
                                }
                              }

                              // Send cancellation email
                              if (apt.user?.email) {
                                try {
                                  await fetch('/api/notifications/email', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      type: 'session_cancelled',
                                      email: apt.user.email,
                                      data: {
                                        mentorName: 'You',
                                        userName: getFullName(apt.user) || apt.user.email || 'User',
                                        startTime: apt.start_time,
                                      },
                                    }),
                                  })
                                } catch (emailError) {
                                  console.error('Error sending cancellation email:', emailError)
                                }
                              }

                              // Reload appointments
                              loadAppointments()
                              alert('Session cancelled. The user has been notified via email.')
                            } catch (error: any) {
                              console.error('Error cancelling session:', error)
                              alert(error.message || 'Failed to cancel session')
                            }
                          }}
                          className="w-full px-3 py-2 bg-red-900/30 text-red-400 border border-red-800 rounded text-sm font-medium hover:bg-red-900/50 transition"
                        >
                          Cancel Session
                        </button>
                      </div>
                    )}
                    {!isMentorView && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <Link
                          href="/contact"
                          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-all duration-300"
                        >
                          Have a problem? Contact us
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 border border-gray-200 dark:border-gray-700 text-center py-12">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No upcoming appointments</h3>
          <p className="text-gray-600 dark:text-gray-400">You don't have any scheduled appointments yet.</p>
        </div>
      )}
    </div>
  )
}
