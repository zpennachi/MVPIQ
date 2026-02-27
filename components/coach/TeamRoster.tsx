'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Team, TeamMember, Profile } from '@/types/database'
import { UserPlus, Users, Mail, Edit, Trash2, X, Save } from 'lucide-react'
import { getFullName } from '@/lib/utils'

interface TeamRosterProps {
  coachId: string
}

export function TeamRoster({ coachId }: TeamRosterProps) {
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<(TeamMember & { player: Profile })[]>([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [editingMember, setEditingMember] = useState<string | null>(null)
  const [editData, setEditData] = useState<{ first_name: string; last_name: string; player_number: string } | null>(null)
  const [inviteData, setInviteData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    playerNumber: '',
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadTeams()
  }, [coachId])

  useEffect(() => {
    if (selectedTeam) {
      loadTeamMembers(selectedTeam.id)
    }
  }, [selectedTeam])

  const loadTeams = async () => {
    const { data } = await supabase
      .from('teams')
      .select('*')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false })

    if (data) {
      setTeams(data as Team[])
      if (data.length > 0 && !selectedTeam) {
        setSelectedTeam(data[0] as Team)
      }
    }
  }

  const loadTeamMembers = async (teamId: string) => {
    const { data } = await supabase
      .from('team_members')
      .select(`
        *,
        player:profiles!team_members_player_id_fkey(*)
      `)
      .eq('team_id', teamId)

    if (data) {
      setMembers(data as any)
    }
  }

  const handleInvitePlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Create player account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: inviteData.email,
        password: inviteData.password,
        options: {
          data: {
            first_name: inviteData.firstName,
            last_name: inviteData.lastName,
            role: 'player',
          },
        },
      })

      if (authError) throw authError

      if (authData.user && selectedTeam) {
        // Add to team roster
        const { error: memberError } = await supabase
          .from('team_members')
          .insert({
            team_id: selectedTeam.id,
            player_id: authData.user.id,
            player_number: inviteData.playerNumber || null,
            invited_by: coachId,
            joined_at: new Date().toISOString(),
          })

        if (memberError) throw memberError

        // Reset form and reload
        setInviteData({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          playerNumber: '',
        })
        setShowInviteModal(false)
        loadTeamMembers(selectedTeam.id)
      }
    } catch (error: any) {
      alert(error.message || 'Failed to invite player')
    } finally {
      setLoading(false)
    }
  }

  const handleEditPlayer = (member: TeamMember & { player: Profile }) => {
    setEditingMember(member.id)
    setEditData({
      first_name: member.player?.first_name || '',
      last_name: member.player?.last_name || '',
      player_number: member.player_number || '',
    })
  }

  const handleSaveEdit = async (memberId: string) => {
    if (!editData || !selectedTeam) return
    
    setSaving(true)
    try {
      const member = members.find(m => m.id === memberId)
      if (!member) throw new Error('Member not found')

      // Update player profile (first_name and last_name)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          first_name: editData.first_name?.trim() || null,
          last_name: editData.last_name?.trim() || null,
        })
        .eq('id', member.player_id)

      if (profileError) throw profileError

      // Update team member (player_number)
      const { error: memberError } = await supabase
        .from('team_members')
        .update({ player_number: editData.player_number || null })
        .eq('id', memberId)

      if (memberError) throw memberError

      setEditingMember(null)
      setEditData(null)
      loadTeamMembers(selectedTeam.id)
    } catch (error: any) {
      alert(error.message || 'Failed to update player')
    } finally {
      setSaving(false)
    }
  }

  const handleRemovePlayer = async (memberId: string, playerName: string) => {
    if (!confirm(`Are you sure you want to remove ${playerName} from the team?`)) return
    
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      if (selectedTeam) {
        loadTeamMembers(selectedTeam.id)
      }
    } catch (error: any) {
      alert(error.message || 'Failed to remove player')
    }
  }

  const createTeam = async (teamName: string) => {
    const { data, error } = await supabase
      .from('teams')
      .insert({
        name: teamName,
        coach_id: coachId,
      })
      .select()
      .single()

    if (error) {
      alert('Failed to create team: ' + error.message)
      return
    }

    if (data) {
      await loadTeams()
      setSelectedTeam(data as Team)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Team Roster</h2>
          <p className="text-sm text-[#d9d9d9] mt-1">
            Manage your team players and their information
          </p>
        </div>
        {teams.length === 0 && (
          <button
            onClick={() => {
              const name = prompt('Enter team name:')
              if (name) createTeam(name)
            }}
            className="bg-[#ffc700] text-black px-4 py-2 rounded-md hover:bg-[#e6b300] transition-all duration-300 active:scale-95 hover:shadow-lg w-full sm:w-auto touch-manipulation font-medium"
          >
            Create Team
          </button>
        )}
      </div>

      {teams.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => setSelectedTeam(team)}
                className={`px-3 sm:px-4 py-2 rounded-md transition-all duration-300 active:scale-95 text-sm sm:text-base touch-manipulation border ${
                  selectedTeam?.id === team.id
                    ? 'bg-[#ffc700] text-black border-[#ffc700]'
                    : 'bg-black text-[#d9d9d9] border-[#272727] hover:border-[#ffc700]/40'
                }`}
              >
                {team.name}
              </button>
            ))}
          </div>

          {selectedTeam && (
            <div className="bg-black border border-[#272727] rounded-lg shadow-mvp p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-white">
                    {selectedTeam.name} Roster
                  </h3>
                  <p className="text-sm text-[#d9d9d9] mt-1">
                    {members.length} player{members.length !== 1 ? 's' : ''} on roster
                  </p>
                </div>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="flex items-center justify-center gap-2 bg-[#ffc700] text-black px-4 py-2 rounded-md hover:bg-[#e6b300] transition w-full sm:w-auto touch-manipulation font-medium text-sm sm:text-base"
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">Invite Players to {selectedTeam.name}</span>
                  <span className="sm:hidden">Invite Players</span>
                </button>
              </div>

              <div className="space-y-2">
                {members.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 mx-auto mb-4 text-[#272727]" />
                    <h3 className="text-lg font-semibold text-white mb-2">No players yet</h3>
                    <p className="text-[#d9d9d9]">Click "Invite Players" to add players to your team.</p>
                  </div>
                ) : (
                  members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 border border-[#272727] rounded-lg hover:border-[#ffc700]/40 transition-all duration-300 hover-lift"
                    >
                      {editingMember === member.id ? (
                        <div className="flex-1 flex flex-col sm:flex-row gap-3">
                          <div className="flex-1">
                            <label className="block text-xs text-[#d9d9d9] mb-1">First Name</label>
                            <input
                              type="text"
                              value={editData?.first_name || ''}
                              onChange={(e) => setEditData({ ...editData!, first_name: e.target.value })}
                              className="w-full px-3 py-2 text-sm border border-[#ffc700] rounded-md bg-black text-white focus:outline-none focus:ring-2 focus:ring-[#ffc700]"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs text-[#d9d9d9] mb-1">Last Name</label>
                            <input
                              type="text"
                              value={editData?.last_name || ''}
                              onChange={(e) => setEditData({ ...editData!, last_name: e.target.value })}
                              className="w-full px-3 py-2 text-sm border border-[#ffc700] rounded-md bg-black text-white focus:outline-none focus:ring-2 focus:ring-[#ffc700]"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs text-[#d9d9d9] mb-1">Player Number</label>
                            <input
                              type="text"
                              value={editData?.player_number || ''}
                              onChange={(e) => setEditData({ ...editData!, player_number: e.target.value })}
                              className="w-full px-3 py-2 text-sm border border-[#ffc700] rounded-md bg-black text-white focus:outline-none focus:ring-2 focus:ring-[#ffc700]"
                            />
                          </div>
                          <div className="flex items-end gap-2">
                            <button
                              onClick={() => handleSaveEdit(member.id)}
                              disabled={saving}
                              className="bg-[#ffc700] text-black px-3 py-2 rounded-md hover:bg-[#e6b300] disabled:opacity-50 transition-all duration-300 active:scale-95 hover:shadow-lg touch-manipulation"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingMember(null)
                                setEditData(null)
                              }}
                              className="border border-[#272727] text-[#d9d9d9] px-3 py-2 rounded-md hover:bg-[#272727] transition-all duration-300 active:scale-95 touch-manipulation"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 bg-[#ffc700]/20 rounded-full flex items-center justify-center">
                              <Users className="w-5 h-5 text-[#ffc700]" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-white">
                                {getFullName(member.player) || member.player?.email}
                              </p>
                              <p className="text-sm text-[#d9d9d9]">
                                {member.player?.email}
                                {member.player_number && ` • #${member.player_number}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditPlayer(member)}
                              className="text-[#ffc700] hover:text-[#e6b300] p-2 rounded-md hover:bg-[#272727] transition-all duration-300 active:scale-95 touch-manipulation"
                              title="Edit player"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRemovePlayer(member.id, getFullName(member.player) || member.player?.email || 'player')}
                              className="text-red-400 hover:text-red-300 p-2 rounded-md hover:bg-[#272727] transition-all duration-300 active:scale-95 touch-manipulation"
                              title="Remove from team"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}

      {showInviteModal && selectedTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-black border border-[#272727] rounded-lg shadow-xl max-w-md w-full p-4 sm:p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg sm:text-xl font-semibold text-white">
                Invite Player to {selectedTeam.name}
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-[#d9d9d9] hover:text-white p-1 touch-manipulation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleInvitePlayer} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#d9d9d9] mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={inviteData.firstName}
                    onChange={(e) => setInviteData({ ...inviteData, firstName: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 text-base border border-[#ffc700] rounded-md bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700] touch-manipulation"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#d9d9d9] mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={inviteData.lastName}
                    onChange={(e) => setInviteData({ ...inviteData, lastName: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 text-base border border-[#ffc700] rounded-md bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700] touch-manipulation"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#d9d9d9] mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 text-base border border-[#ffc700] rounded-md bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700] touch-manipulation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#d9d9d9] mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={inviteData.password}
                  onChange={(e) => setInviteData({ ...inviteData, password: e.target.value })}
                  required
                  minLength={6}
                  className="w-full px-3 py-2.5 text-base border border-[#ffc700] rounded-md bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700] touch-manipulation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#d9d9d9] mb-1">
                  Player Number (Optional)
                </label>
                <input
                  type="text"
                  value={inviteData.playerNumber}
                  onChange={(e) => setInviteData({ ...inviteData, playerNumber: e.target.value })}
                  className="w-full px-3 py-2.5 text-base border border-[#ffc700] rounded-md bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700] touch-manipulation"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2.5 border border-[#272727] rounded-md text-[#d9d9d9] hover:bg-[#272727] transition font-medium touch-manipulation"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-[#ffc700] text-black rounded-md hover:bg-[#e6b300] disabled:opacity-50 disabled:cursor-not-allowed transition font-medium touch-manipulation"
                >
                  {loading ? 'Signing Up...' : 'Sign Up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
