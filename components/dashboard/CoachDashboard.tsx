'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TeamRoster } from '@/components/coach/TeamRoster'
import { VideoURLSubmission } from '@/components/video/VideoURLSubmission'
import { SubmissionList } from '@/components/feedback/SubmissionList'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import type { Video, FeedbackSubmission, Team, Profile } from '@/types/database'
import { Film, MessageSquare, Users, CheckCircle, Clock } from 'lucide-react'
import { getFullName, getFirstName } from '@/lib/utils'

interface CoachDashboardProps {
  coachId: string
}

export function CoachDashboard({ coachId }: CoachDashboardProps) {
  const [videos, setVideos] = useState<Video[]>([])
  const [submissions, setSubmissions] = useState<FeedbackSubmission[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [activeTab, setActiveTab] = useState<'home' | 'roster'>('home')
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<{ first_name: string | null; last_name: string | null; email: string } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const loadProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', coachId)
        .single()
      if (data) setProfile(data)
    }
    loadProfile()
  }, [coachId])

  useEffect(() => {
    loadData()
  }, [coachId])

  useEffect(() => {
    if (selectedTeam) {
      loadTeamVideos(selectedTeam.id)
    }
  }, [selectedTeam])

  const loadData = async () => {
    setLoading(true)
    
    // Load teams
    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false })

    if (teamsError) {
      console.error('Error loading teams:', teamsError)
    }

    if (teamsData) {
      setTeams(teamsData as Team[])
      // Auto-select first team if none selected
      if (teamsData.length > 0 && !selectedTeam) {
        setSelectedTeam(teamsData[0] as Team)
      }
    } else {
      setTeams([])
    }

    // Load all submissions for coach's teams
    if (teamsData && teamsData.length > 0) {
      const teamIds = teamsData.map(t => t.id)
      
      // First, get all videos for this coach's teams
      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select('*')
        .in('team_id', teamIds)
        .order('created_at', { ascending: false })

      if (videosError) {
        console.error('Error loading videos:', videosError)
      }

      if (videosData) {
        setVideos(videosData as Video[])
        const videoIds = videosData.map(v => v.id)
        
        // Then, get all submissions for those videos
        if (videoIds.length > 0) {
          const { data: subsData, error: subsError } = await supabase
            .from('feedback_submissions')
            .select('*, videos(*)')
            .in('video_id', videoIds)
            .order('created_at', { ascending: false })

          if (subsError) {
            console.error('Error loading submissions:', subsError)
          }

          if (subsData) {
            setSubmissions(subsData as FeedbackSubmission[])
          }
        } else {
          // No videos yet, so no submissions
          setSubmissions([])
        }
      } else {
        // No videos yet
        setVideos([])
        setSubmissions([])
      }
    } else {
      // No teams yet
      setVideos([])
      setSubmissions([])
    }

    setLoading(false)
  }

  const loadTeamVideos = async (teamId: string) => {
    const { data } = await supabase
      .from('videos')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })

    if (data) {
      setVideos(data as Video[])
    }
  }

  const handleVideoSubmitted = () => {
    loadData()
  }

  const pendingCount = submissions.filter(s => s.status !== 'completed').length
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
    <div className="space-y-6 fade-in">
      <div className="dotted-bg-subtle rounded-lg p-4 -m-4 sm:-m-6 lg:-m-8 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">
          Welcome Back{firstName ? `, ${firstName}` : ''}!
        </h1>
        <p className="mt-2 text-sm sm:text-base text-[#d9d9d9]">
          Manage your team roster, submit videos, and track feedback progress
        </p>
      </div>


      <div className="border-b border-[#272727] overflow-x-auto">
        <nav className="-mb-px flex space-x-4 sm:space-x-8 min-w-max">
          <button
            onClick={() => setActiveTab('home')}
            className={`${
              activeTab === 'home'
                ? 'border-[#ffc700] text-[#ffc700]'
                : 'border-transparent text-[#d9d9d9] hover:text-white hover:border-[#272727]'
            } whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 touch-manipulation transition`}
          >
            <Film className="w-4 h-4 sm:w-5 sm:h-5" />
            Home
          </button>
          <button
            onClick={() => setActiveTab('roster')}
            className={`${
              activeTab === 'roster'
                ? 'border-[#ffc700] text-[#ffc700]'
                : 'border-transparent text-[#d9d9d9] hover:text-white hover:border-[#272727]'
            } whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 touch-manipulation transition`}
          >
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            Team Roster
          </button>
        </nav>
      </div>

      {activeTab === 'home' && (
        <div className="space-y-6">
          <div className="bg-black border border-[#272727] rounded-lg shadow-mvp p-4 sm:p-6">
            <div className="mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">Submit a Video</h2>
              <p className="text-sm text-[#d9d9d9]">
                Submit game footage for your team to receive professional analysis and feedback
              </p>
              {selectedTeam && (
                <p className="text-xs text-[#d9d9d9]/70 mt-1">
                  Selected team: <span className="text-[#ffc700]">{selectedTeam.name}</span>
                </p>
              )}
            </div>
            <VideoURLSubmission
              userId={coachId}
              userRole="coach"
              teamId={selectedTeam?.id || null}
              onSubmitted={handleVideoSubmitted}
            />
          </div>

          <div className="bg-black border border-[#272727] rounded-lg shadow-mvp p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-2 text-white">
              Pending Feedback
            </h2>
            <p className="text-sm text-[#d9d9d9] mb-4">
              {pendingCount === 0 
                ? 'All submissions have been completed' 
                : `${pendingCount} submission${pendingCount !== 1 ? 's' : ''} awaiting feedback`}
            </p>
            {pendingCount === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-[#272727]" />
                <p className="text-[#d9d9d9]">No pending submissions. Submit a video to get started.</p>
              </div>
            ) : (
              <SubmissionList
                submissions={submissions.filter(s => s.status !== 'completed')}
                userRole="coach"
                onUpdate={loadData}
              />
            )}
          </div>

          <div className="bg-black border border-[#272727] rounded-lg shadow-mvp p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-2 text-white">
              Completed Feedback
            </h2>
            <p className="text-sm text-[#d9d9d9] mb-4">
              {completedCount === 0 
                ? 'No completed feedback yet' 
                : `${completedCount} feedback response${completedCount !== 1 ? 's' : ''} received`}
            </p>
            {completedCount === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-[#272727]" />
                <p className="text-[#d9d9d9]">No completed feedback yet.</p>
              </div>
            ) : (
              <SubmissionList
                submissions={submissions.filter(s => s.status === 'completed')}
                userRole="coach"
                onUpdate={loadData}
              />
            )}
          </div>
        </div>
      )}

      {activeTab === 'roster' && (
        <TeamRoster coachId={coachId} />
      )}
    </div>
  )
}
