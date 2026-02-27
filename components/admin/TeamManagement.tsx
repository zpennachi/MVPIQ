'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Team, TeamMember, Profile } from '@/types/database'
import { Search, Edit, Trash2, Users, School, UserPlus, X } from 'lucide-react'
import { format } from 'date-fns'
import { getFullName } from '@/lib/utils'

interface TeamManagementProps {
  adminId: string
}

export function TeamManagement({ adminId }: TeamManagementProps) {
  const [teams, setTeams] = useState<(Team & { coach?: Profile; memberCount?: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [teamMembers, setTeamMembers] = useState<(TeamMember & { player?: Profile })[]>([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteData, setInviteData] = useState({ email: '', fullName: '' })
  const [inviteLoading, setInviteLoading] = useState(false)
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
      // Use admin API endpoint to bypass RLS
      const response = await fetch('/api/admin/teams')
      const result = await response.json()

      if (!response.ok) {
        console.error('Error loading teams:', result.error)
        setTeams([])
        return
      }

      console.log('Loaded teams:', { count: result.count, teamsFound: result.teams.length })
      setTeams(result.teams || [])
    } catch (error) {
      console.error('Error loading teams:', error)
      setTeams([])
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

  const handleInviteSchool = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const confirmMessage = `Are you sure you want to invite ${inviteData.email} as a school?\n\nThey will receive an email with login instructions.`
    
    if (!confirm(confirmMessage)) return

    setInviteLoading(true)

    try {
      const response = await fetch('/api/admin/invite-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...inviteData, role: 'school' }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to invite school')
      }

      alert(data.message || 'School invited successfully!')
      setShowInviteModal(false)
      setInviteData({ email: '', fullName: '' })
      // Reload teams to show new school if they create a team
      loadTeams()
    } catch (error: any) {
      alert(error.message || 'Failed to invite school')
    } finally {
      setInviteLoading(false)
    }
  }

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (getFullName(team.coach).toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
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
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 bg-[#ffc700] text-black rounded-md hover:bg-[#e6b300] transition-all duration-300 active:scale-95 hover:shadow-lg flex items-center gap-2 font-medium relative z-10"
            type="button"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Invite School</span>
            <span className="sm:hidden">Invite</span>
          </button>
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
                      Coach: {getFullName(team.coach) || team.coach?.email || 'Unknown'}
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
                          {getFullName(member.player) || member.player?.email || 'Unknown'}
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

      {/* Invite School Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
          <div className="bg-black border border-[#272727] rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Invite School</h3>
              <button
                onClick={() => {
                  setShowInviteModal(false)
                  setInviteData({ email: '', fullName: '' })
                }}
                className="text-[#d9d9d9] hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInviteSchool} className="space-y-4">
              <p className="text-sm text-[#d9d9d9]/70 mb-4">
                Inviting a new school account. They will receive an email with login instructions.
              </p>

              <div>
                <label htmlFor="invite-email" className="block text-sm font-medium text-[#d9d9d9] mb-1">
                  Email *
                </label>
                <input
                  id="invite-email"
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-[#ffc700] rounded-md bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700]"
                  placeholder="school@example.com"
                />
              </div>

              <div>
                <label htmlFor="invite-name" className="block text-sm font-medium text-[#d9d9d9] mb-1">
                  School Name
                </label>
                <input
                  id="invite-name"
                  type="text"
                  value={inviteData.fullName}
                  onChange={(e) => setInviteData({ ...inviteData, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-[#ffc700] rounded-md bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700]"
                  placeholder="Optional"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="flex-1 px-4 py-2 bg-[#ffc700] text-black rounded-md hover:bg-[#e6b300] disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
                >
                  {inviteLoading ? 'Inviting...' : 'Send Invitation'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false)
                    setInviteData({ email: '', fullName: '' })
                  }}
                  className="px-4 py-2 border border-[#272727] text-[#d9d9d9] rounded-md hover:bg-[#272727] transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
