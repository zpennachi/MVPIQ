'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Team, TeamMember, Profile } from '@/types/database'
import { Search, Edit, Trash2, Users, School } from 'lucide-react'
import { format } from 'date-fns'

interface TeamManagementProps {
  adminId: string
}

export function TeamManagement({ adminId }: TeamManagementProps) {
  const [teams, setTeams] = useState<(Team & { coach?: Profile; memberCount?: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [teamMembers, setTeamMembers] = useState<(TeamMember & { player?: Profile })[]>([])
  const supabase = createClient()

  useEffect(() => {
    loadTeams()
  }, [adminId])

  useEffect(() => {
    if (selectedTeam) {
      loadTeamMembers(selectedTeam)
    }
  }, [selectedTeam])

  const loadTeams = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          coach:profiles!teams_coach_id_fkey(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get member counts
      const teamsWithCounts = await Promise.all(
        (data || []).map(async (team) => {
          const { count } = await supabase
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', team.id)

          return {
            ...team,
            memberCount: count || 0,
          }
        })
      )

      setTeams(teamsWithCounts as any)
    } catch (error) {
      console.error('Error loading teams:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTeamMembers = async (teamId: string) => {
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        *,
        player:profiles!team_members_player_id_fkey(*)
      `)
      .eq('team_id', teamId)

    if (error) {
      console.error('Error loading team members:', error)
      return
    }

    setTeamMembers(data as any)
  }

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`Are you sure you want to delete "${teamName}"? This will remove all team members.`)) return

    try {
      // First delete team members
      await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)

      // Then delete team
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId)

      if (error) throw error

      loadTeams()
      if (selectedTeam === teamId) {
        setSelectedTeam(null)
        setTeamMembers([])
      }
      alert('Team deleted successfully')
    } catch (error: any) {
      alert(error.message || 'Failed to delete team')
    }
  }

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (team.coach?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
    (team.coach?.email?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-[#272727] rounded w-1/3 animate-pulse"></div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-[#272727] rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="dotted-bg-subtle rounded-lg p-4 -m-4 sm:-m-6 lg:-m-8 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Team/School Management</h2>
            <p className="text-sm text-[#d9d9d9] mt-1">Manage all teams and schools</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#d9d9d9]" />
        <input
          type="text"
          placeholder="Search teams by name or coach..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-[#272727] rounded-md bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700]"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Teams List */}
        <div className="bg-black border border-[#272727] rounded-lg overflow-hidden">
          <div className="p-4 border-b border-[#272727]">
            <h3 className="font-semibold text-white">All Teams ({filteredTeams.length})</h3>
          </div>
          <div className="divide-y divide-[#272727] max-h-[600px] overflow-y-auto">
            {filteredTeams.map((team) => (
              <div
                key={team.id}
                className={`p-4 cursor-pointer hover:bg-[#272727]/50 transition ${
                  selectedTeam === team.id ? 'bg-[#272727]/50 border-l-4 border-[#ffc700]' : ''
                }`}
                onClick={() => setSelectedTeam(team.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <School className="w-4 h-4 text-[#ffc700]" />
                      <h4 className="font-semibold text-white">{team.name}</h4>
                    </div>
                    <p className="text-sm text-[#d9d9d9]">
                      Coach: {team.coach?.full_name || team.coach?.email || 'Unknown'}
                    </p>
                    <p className="text-xs text-[#d9d9d9]/70 mt-1">
                      {team.memberCount || 0} members • Created {format(new Date(team.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteTeam(team.id, team.name)
                    }}
                    className="p-2 text-red-400 hover:bg-[#272727] rounded transition"
                    title="Delete team"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {filteredTeams.length === 0 && (
            <div className="text-center py-12">
              <p className="text-[#d9d9d9]">No teams found</p>
            </div>
          )}
        </div>

        {/* Team Details */}
        {selectedTeam && (
          <div className="bg-black border border-[#272727] rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Team Members</h3>
            {teamMembers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto mb-4 text-[#272727]" />
                <p className="text-[#d9d9d9]">No members in this team</p>
              </div>
            ) : (
              <div className="space-y-3">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="p-3 bg-[#272727]/50 border border-[#272727] rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">
                          {member.player?.full_name || member.player?.email || 'Unknown'}
                        </p>
                        <p className="text-sm text-[#d9d9d9]">
                          {member.player?.email}
                          {member.player_number && ` • #${member.player_number}`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
