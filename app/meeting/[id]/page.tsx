'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Video, Calendar, Clock, User, ExternalLink } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import Link from 'next/link'
import { getFullName } from '@/lib/utils'

export default function MeetingPage() {
  const params = useParams()
  const router = useRouter()
  const meetingId = params.id as string
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMentor, setIsMentor] = useState(false)
  const [otherParty, setOtherParty] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    loadSession()
  }, [meetingId])

  useEffect(() => {
    if (session) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          const userIsMentor = user.id === session.mentor_id
          setIsMentor(userIsMentor)
          setOtherParty(userIsMentor ? session.user : session.mentor)
        }
      })
    }
  }, [session])

  const loadSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Please log in to view this meeting')
        setLoading(false)
        return
      }

      // Find session by meeting link (check if meeting_link contains the meeting ID)
      const { data: sessions, error: sessionError } = await supabase
        .from('booked_sessions')
        .select(`
          *,
          mentor:profiles!booked_sessions_mentor_id_fkey(id, first_name, last_name, email, profile_photo_url),
          user:profiles!booked_sessions_user_id_fkey(id, first_name, last_name, email, profile_photo_url)
        `)
        .ilike('meeting_link', `%${meetingId}%`)
        .single()

      if (sessionError || !sessions) {
        setError('Meeting not found')
        setLoading(false)
        return
      }

      // Verify user is part of this session
      if (sessions.user_id !== user.id && sessions.mentor_id !== user.id) {
        setError('You do not have access to this meeting')
        setLoading(false)
        return
      }

      setSession(sessions)
    } catch (err: any) {
      setError(err.message || 'Failed to load meeting')
    } finally {
      setLoading(false)
    }
  }

  const getGoogleMeetLink = () => {
    // Generate a Google Meet link
    // Users can click to create/join a meeting
    return 'https://meet.google.com/new'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black dotted-bg">
        <div className="text-white">Loading meeting details...</div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black dotted-bg">
        <div className="text-center">
          <div className="text-red-400 mb-4">{error || 'Meeting not found'}</div>
          <Link
            href="/dashboard"
            className="text-yellow-500 hover:text-yellow-400 underline"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black dotted-bg p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-black border-2 border-[#272727] rounded-lg shadow-mvp p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <Video className="w-8 h-8 text-yellow-500" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Meeting Room</h1>
          </div>

          <div className="space-y-6">
            {/* Session Details */}
            <div className="bg-[#1a1a1a] border border-[#272727] rounded-lg p-4 sm:p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Session Details</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-yellow-500" />
                  <div>
                    <div className="text-sm text-gray-400">Date & Time</div>
                    <div className="text-white font-medium">
                      {format(parseISO(session.start_time), 'PPp')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  <div>
                    <div className="text-sm text-gray-400">Duration</div>
                    <div className="text-white font-medium">
                      {format(parseISO(session.start_time), 'h:mm a')} - {format(parseISO(session.end_time), 'h:mm a')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-yellow-500" />
                  <div>
                    <div className="text-sm text-gray-400">
                      {isMentor ? 'Student' : 'Mentor'}
                    </div>
                    <div className="text-white font-medium">
                      {getFullName(otherParty) || otherParty?.email || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Meeting Link Options */}
            <div className="bg-[#1a1a1a] border border-[#272727] rounded-lg p-4 sm:p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Join Meeting</h2>
              <div className="space-y-3">
                <a
                  href={getGoogleMeetLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-3 px-4 rounded-lg transition"
                >
                  <span className="flex items-center gap-2">
                    <Video className="w-5 h-5" />
                    Create Google Meet
                  </span>
                  <ExternalLink className="w-5 h-5" />
                </a>
                <p className="text-sm text-gray-400">
                  Click to create a new Google Meet room. Share the link with {getFullName(otherParty) || 'the other party'}.
                </p>
              </div>
            </div>

            {/* Back to Dashboard */}
            <div className="pt-4 border-t border-[#272727]">
              <Link
                href="/dashboard"
                className="text-yellow-500 hover:text-yellow-400 underline text-sm"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
