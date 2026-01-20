'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { BookedSession, Profile } from '@/types/database'
import { Calendar, Clock, Video, MapPin } from 'lucide-react'
import { format, startOfWeek, addDays, eachDayOfInterval, addWeeks, subWeeks, isSameDay, parseISO } from 'date-fns'
import Link from 'next/link'

interface MyAppointmentsProps {
  userId: string
}

export function MyAppointments({ userId }: MyAppointmentsProps) {
  const [appointments, setAppointments] = useState<(BookedSession & { mentor?: Profile })[]>([])
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: addDays(weekStart, 6),
  })

  useEffect(() => {
    loadAppointments()
  }, [userId, currentWeek])

  const loadAppointments = async () => {
    setLoading(true)
    const weekEnd = addDays(weekStart, 7)

    const { data, error } = await supabase
      .from('booked_sessions')
      .select(`
        *,
        mentor:profiles!booked_sessions_mentor_id_fkey(id, full_name, email, profile_photo_url)
      `)
      .eq('user_id', userId)
      .in('status', ['pending', 'confirmed'])
      .gte('start_time', weekStart.toISOString())
      .lt('start_time', weekEnd.toISOString())
      .order('start_time', { ascending: true })

    if (error) {
      console.error('Error loading appointments:', error)
    } else {
      setAppointments((data as any) || [])
    }
    setLoading(false)
  }

  const getAppointmentsForDay = (day: Date) => {
    return appointments.filter(apt => {
      const aptDate = parseISO(apt.start_time)
      return isSameDay(aptDate, day)
    })
  }

  const formatTime = (dateString: string) => {
    return format(parseISO(dateString), 'h:mm a')
  }

  const getInitials = (name: string | null) => {
    if (!name) return 'M'
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name[0].toUpperCase()
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

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            Upcoming Sessions
          </h2>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
              className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300 active:scale-95 touch-manipulation"
            >
              ← Prev
            </button>
            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mx-1 flex-1 text-center">
              {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d')}
            </span>
            <button
              onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
              className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300 active:scale-95 touch-manipulation"
            >
              Next →
            </button>
          </div>
        </div>

        {/* Desktop: Grid layout */}
        <div className="hidden md:grid md:grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const dayAppointments = getAppointmentsForDay(day)
            return (
              <div
                key={day.toISOString()}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 min-h-[150px]"
              >
                <div className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
                  {format(day, 'EEE')}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  {format(day, 'MMM d')}
                </div>
                <div className="space-y-1">
                  {dayAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded p-1 text-xs"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        {apt.mentor?.profile_photo_url ? (
                          <img
                            src={apt.mentor.profile_photo_url}
                            alt={apt.mentor?.full_name || 'Mentor'}
                            className="w-5 h-5 rounded-full object-cover flex-shrink-0 border border-yellow-400"
                          />
                        ) : (
                          <div className="w-5 h-5 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0 border border-yellow-400">
                            <span className="text-[10px] font-bold text-yellow-800 dark:text-yellow-300">
                              {getInitials(apt.mentor?.full_name || null)}
                            </span>
                          </div>
                        )}
                        <div className="font-medium text-yellow-800 dark:text-yellow-300 truncate">
                          {formatTime(apt.start_time)}
                        </div>
                      </div>
                      <div className="text-yellow-600 dark:text-yellow-400 text-xs truncate">
                        {apt.mentor?.full_name || 'Mentor'}
                      </div>
                      {apt.meeting_link && (
                        <a
                          href={apt.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-yellow-600 dark:text-yellow-400 hover:underline text-xs block mt-1"
                        >
                          Join Meeting →
                        </a>
                      )}
                    </div>
                  ))}
                  {dayAppointments.length === 0 && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
                      No appointments
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Mobile: Horizontal scrollable */}
        <div className="md:hidden overflow-x-auto pb-4 -mx-4 px-4" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin' }}>
          <div className="flex gap-3 min-w-max">
            {weekDays.map((day) => {
              const dayAppointments = getAppointmentsForDay(day)
              return (
                <div
                  key={day.toISOString()}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 min-w-[160px] w-[160px] flex-shrink-0"
                >
                  <div className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
                    {format(day, 'EEE')}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {format(day, 'MMM d')}
                  </div>
                  <div className="space-y-1.5">
                    {dayAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded p-1.5 text-xs"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          {apt.mentor?.profile_photo_url ? (
                            <img
                              src={apt.mentor.profile_photo_url}
                              alt={apt.mentor?.full_name || 'Mentor'}
                              className="w-5 h-5 rounded-full object-cover flex-shrink-0 border border-yellow-400"
                            />
                          ) : (
                            <div className="w-5 h-5 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0 border border-yellow-400">
                              <span className="text-[10px] font-bold text-yellow-800 dark:text-yellow-300">
                                {getInitials(apt.mentor?.full_name || null)}
                              </span>
                            </div>
                          )}
                          <div className="font-medium text-yellow-800 dark:text-yellow-300 truncate">
                            {formatTime(apt.start_time)}
                          </div>
                        </div>
                        <div className="text-yellow-600 dark:text-yellow-400 text-xs truncate">
                          {apt.mentor?.full_name || 'Mentor'}
                        </div>
                        {apt.meeting_link && (
                          <a
                            href={apt.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-yellow-600 dark:text-yellow-400 hover:underline text-xs block mt-1 touch-manipulation"
                          >
                            Join →
                          </a>
                        )}
                      </div>
                    ))}
                    {dayAppointments.length === 0 && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
                        No appointments
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {appointments.length > 0 && (
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
                      <strong>Mentor:</strong>
                      {apt.mentor?.profile_photo_url ? (
                        <img
                          src={apt.mentor.profile_photo_url}
                          alt={apt.mentor?.full_name || 'Mentor'}
                          className="w-6 h-6 rounded-full object-cover border border-gray-300 dark:border-gray-600"
                        />
                      ) : (
                        <div className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center border border-gray-300 dark:border-gray-600">
                          <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">
                            {getInitials(apt.mentor?.full_name || null)}
                          </span>
                        </div>
                      )}
                      <span>{apt.mentor?.full_name || apt.mentor?.email || 'Mentor'}</span>
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
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <Link
                        href="/contact"
                        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-all duration-300"
                      >
                        Have a problem? Contact us
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
