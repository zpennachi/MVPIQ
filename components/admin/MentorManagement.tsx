'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, FeedbackSubmission } from '@/types/database'
import { Search, Edit, UserCheck, UserX, MessageSquare, TrendingUp, UserPlus, X, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { getFullName } from '@/lib/utils'

interface MentorManagementProps {
  adminId: string
}

export function MentorManagement({ adminId }: MentorManagementProps) {
  const [mentors, setMentors] = useState<(Profile & { stats?: { submissions: number; completed: number; rating: number } })[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingMentor, setEditingMentor] = useState<string | null>(null)
  const [editData, setEditData] = useState<{ first_name: string; last_name: string; email: string; phone_number: string } | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteData, setInviteData] = useState({ email: '', firstName: '', lastName: '' })
  const [inviteLoading, setInviteLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadMentors()
  }, [adminId])

  const loadMentors = async () => {
    setLoading(true)
    try {
      // Use admin API endpoint to bypass RLS and get all mentors
      const response = await fetch('/api/admin/users')
      const result = await response.json()

      if (!response.ok) {
        console.error('Error loading mentors:', result.error)
        setMentors([])
        return
      }

      // Filter to only mentors
      const data = (result.users || []).filter((user: Profile) => user.role === 'mentor')

      // Load stats for each mentor
      const mentorsWithStats = await Promise.all(
        data.map(async (mentor: Profile) => {
          const { count: totalSubmissions } = await supabase
            .from('feedback_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('mentor_id', mentor.id)

          const { count: completedSubmissions } = await supabase
            .from('feedback_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('mentor_id', mentor.id)
            .eq('status', 'completed')

          // Calculate average rating
          const { data: submissions } = await supabase
            .from('feedback_submissions')
            .select('rating')
            .eq('mentor_id', mentor.id)
            .not('rating', 'is', null)

          const avgRating = submissions && submissions.length > 0
            ? submissions.reduce((sum, s) => sum + (s.rating || 0), 0) / submissions.length
            : 0

          return {
            ...mentor,
            stats: {
              submissions: totalSubmissions || 0,
              completed: completedSubmissions || 0,
              rating: avgRating,
            },
          }
        })
      )

      setMentors(mentorsWithStats as any)
    } catch (error) {
      console.error('Error loading mentors:', error)
      setMentors([])
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (mentor: Profile) => {
    setEditingMentor(mentor.id)
    setEditData({
      first_name: mentor.first_name || '',
      last_name: mentor.last_name || '',
      email: mentor.email,
      phone_number: (mentor as any).phone_number || '',
    })
  }

  const handleSave = async (mentorId: string) => {
    if (!editData) return

    // Find the original mentor data to compare changes
    const originalMentor = mentors.find(m => m.id === mentorId)
    if (!originalMentor) return

    // Check if email is changing
    const emailChanged = originalMentor.email !== editData.email

    // Build confirmation message
    let confirmMessage = 'Are you sure you want to update this mentor?'
    if (emailChanged) {
      confirmMessage += `\n\n⚠️ Email will change from "${originalMentor.email}" to "${editData.email}".`
    }

    if (!confirm(confirmMessage)) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: editData.first_name?.trim() || null,
          last_name: editData.last_name?.trim() || null,
          phone_number: editData.phone_number || null,
        })
        .eq('id', mentorId)

      if (error) throw error

      // Update email in auth if changed (via API)
      if (editData.email && emailChanged) {
        try {
          const response = await fetch('/api/admin/update-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: mentorId, email: editData.email }),
          })
          if (!response.ok) {
            const data = await response.json()
            console.error('Error updating email:', data.error)
          }
        } catch (error) {
          console.error('Error updating email:', error)
        }
      }

      setEditingMentor(null)
      setEditData(null)
      loadMentors()
      alert('Mentor updated successfully')
    } catch (error: any) {
      alert(error.message || 'Failed to update mentor')
    }
  }

  const handleToggleActive = async (mentorId: string) => {
    const mentor = mentors.find(m => m.id === mentorId)
    const mentorName = getFullName(mentor) || mentor?.email || 'this mentor'
    const currentStatus = (mentor as any)?.is_active !== false // Default to true
    
    if (!confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} ${mentorName}?`)) return

    try {
      const response = await fetch('/api/admin/toggle-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: mentorId, isActive: !currentStatus }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update mentor status')
      }

      loadMentors()
      alert(data.message || `Mentor ${currentStatus ? 'deactivated' : 'activated'} successfully`)
    } catch (error: any) {
      alert(error.message || 'Failed to update mentor status')
    }
  }

  const handleDeleteMentor = async (mentorId: string) => {
    const mentor = mentors.find(m => m.id === mentorId)
    const mentorName = getFullName(mentor) || mentor?.email || 'this mentor'
    
    if (!confirm(`⚠️ WARNING: Are you sure you want to PERMANENTLY DELETE ${mentorName}?\n\nThis action cannot be undone and will delete all associated data.`)) return

    try {
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: mentorId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete mentor')
      }

      loadMentors()
      alert('Mentor deleted successfully')
    } catch (error: any) {
      alert(error.message || 'Failed to delete mentor')
    }
  }

  const handleInviteMentor = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const confirmMessage = `Are you sure you want to invite ${inviteData.email} as a mentor?\n\nThey will receive an email with login instructions.`
    
    if (!confirm(confirmMessage)) return

    setInviteLoading(true)

    try {
      const response = await fetch('/api/admin/invite-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...inviteData, role: 'mentor' }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to invite mentor')
      }

      alert(data.message || 'Mentor invited successfully!')
      setShowInviteModal(false)
      setInviteData({ email: '', firstName: '', lastName: '' })
      loadMentors()
    } catch (error: any) {
      alert(error.message || 'Failed to invite mentor')
    } finally {
      setInviteLoading(false)
    }
  }

  const filteredMentors = mentors.filter(mentor =>
    mentor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (getFullName(mentor).toLowerCase().includes(searchTerm.toLowerCase()) || false)
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
            <h2 className="text-xl sm:text-2xl font-bold text-white">Mentor Management</h2>
            <p className="text-sm text-[#d9d9d9] mt-1">Manage all mentor accounts</p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 bg-[#ffc700] text-black rounded-md hover:bg-[#e6b300] transition-all duration-300 active:scale-95 hover:shadow-lg flex items-center gap-2 font-medium relative z-10"
            type="button"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Invite Mentor</span>
            <span className="sm:hidden">Invite</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#d9d9d9]" />
        <input
          type="text"
          placeholder="Search mentors by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-[#272727] rounded-md bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700]"
        />
      </div>

      {/* Mentors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMentors.map((mentor) => (
          <div
            key={mentor.id}
            className="bg-black border border-[#272727] rounded-lg p-4 hover:border-[#ffc700]/40 transition-all duration-300 hover-lift"
          >
            {editingMentor === mentor.id ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editData?.first_name || ''}
                  onChange={(e) => setEditData({ ...editData!, first_name: e.target.value })}
                  placeholder="First Name"
                  className="w-full px-3 py-2 text-sm border border-[#ffc700] rounded bg-black text-white"
                />
                <input
                  type="text"
                  value={editData?.last_name || ''}
                  onChange={(e) => setEditData({ ...editData!, last_name: e.target.value })}
                  placeholder="Last Name"
                  className="w-full px-3 py-2 text-sm border border-[#ffc700] rounded bg-black text-white"
                />
                <input
                  type="email"
                  value={editData?.email || ''}
                  onChange={(e) => setEditData({ ...editData!, email: e.target.value })}
                  placeholder="Email"
                  className="w-full px-3 py-2 text-sm border border-[#ffc700] rounded bg-black text-white"
                />
                <input
                  type="tel"
                  value={editData?.phone_number || ''}
                  onChange={(e) => setEditData({ ...editData!, phone_number: e.target.value })}
                  placeholder="Phone Number"
                  className="w-full px-3 py-2 text-sm border border-[#ffc700] rounded bg-black text-white"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave(mentor.id)}
                    className="flex-1 px-3 py-2 bg-[#ffc700] text-black rounded text-sm font-medium hover:bg-[#e6b300] transition"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingMentor(null)
                      setEditData(null)
                    }}
                    className="flex-1 px-3 py-2 border border-[#272727] text-[#d9d9d9] rounded text-sm hover:bg-[#272727] transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">
                      {getFullName(mentor) || 'No name'}
                    </h3>
                    <p className="text-sm text-[#d9d9d9]">{mentor.email}</p>
                    {(mentor as any).phone_number && (
                      <p className="text-xs text-[#d9d9d9]/70 mt-1">{(mentor as any).phone_number}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {(mentor as any)?.is_active !== false ? (
                      <button
                        onClick={() => handleToggleActive(mentor.id)}
                        className="p-2 text-red-400 hover:bg-[#272727] rounded transition"
                        title="Deactivate"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleToggleActive(mentor.id)}
                          className="p-2 text-green-400 hover:bg-[#272727] rounded transition"
                          title="Reactivate"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMentor(mentor.id)}
                          className="p-2 text-red-500 hover:bg-[#272727] rounded transition"
                          title="Delete permanently"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {mentor.stats && (
                  <div className="space-y-2 mb-3 pt-3 border-t border-[#272727]">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#d9d9d9]">Submissions:</span>
                      <span className="text-white font-medium">{mentor.stats.submissions}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#d9d9d9]">Completed:</span>
                      <span className="text-green-400 font-medium">{mentor.stats.completed}</span>
                    </div>
                    {mentor.stats.rating > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#d9d9d9]">Avg Rating:</span>
                        <span className="text-[#ffc700] font-medium">
                          {mentor.stats.rating.toFixed(1)}/5
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-3 border-t border-[#272727]">
                  <button
                    onClick={() => handleEdit(mentor)}
                    className="flex-1 px-3 py-2 bg-[#272727] text-[#ffc700] rounded text-sm font-medium hover:bg-[#272727]/80 transition"
                  >
                    Edit
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {filteredMentors.length === 0 && (
        <div className="text-center py-12 bg-black border border-[#272727] rounded-lg">
          <UserCheck className="w-16 h-16 mx-auto mb-4 text-[#272727]" />
          <p className="text-[#d9d9d9]">No mentors found</p>
        </div>
      )}

      <div className="text-sm text-[#d9d9d9]">
        Showing {filteredMentors.length} of {mentors.length} mentors
      </div>

      {/* Invite Mentor Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
          <div className="bg-black border border-[#272727] rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Invite Mentor</h3>
              <button
                onClick={() => {
                  setShowInviteModal(false)
                  setInviteData({ email: '', firstName: '', lastName: '' })
                }}
                className="text-[#d9d9d9] hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInviteMentor} className="space-y-4">
              <p className="text-sm text-[#d9d9d9]/70 mb-4">
                Inviting a new mentor/professional athlete. They will receive an email with login instructions.
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
                  placeholder="mentor@example.com"
                />
              </div>

              <div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="invite-first-name" className="block text-sm font-medium text-[#d9d9d9] mb-1">
                      First Name
                    </label>
                    <input
                      id="invite-first-name"
                      type="text"
                      value={inviteData.firstName}
                      onChange={(e) => setInviteData({ ...inviteData, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-[#ffc700] rounded-md bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700]"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label htmlFor="invite-last-name" className="block text-sm font-medium text-[#d9d9d9] mb-1">
                      Last Name
                    </label>
                    <input
                      id="invite-last-name"
                      type="text"
                      value={inviteData.lastName}
                      onChange={(e) => setInviteData({ ...inviteData, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-[#ffc700] rounded-md bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700]"
                      placeholder="Optional"
                    />
                  </div>
                </div>
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
                    setInviteData({ email: '', firstName: '', lastName: '' })
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
