'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, FeedbackSubmission } from '@/types/database'
import { Search, Edit, UserCheck, UserX, MessageSquare, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'

interface MentorManagementProps {
  adminId: string
}

export function MentorManagement({ adminId }: MentorManagementProps) {
  const [mentors, setMentors] = useState<(Profile & { stats?: { submissions: number; completed: number; rating: number } })[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingMentor, setEditingMentor] = useState<string | null>(null)
  const [editData, setEditData] = useState<{ full_name: string; email: string; phone_number: string } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadMentors()
  }, [adminId])

  const loadMentors = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'mentor')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Load stats for each mentor
      const mentorsWithStats = await Promise.all(
        (data || []).map(async (mentor) => {
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
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (mentor: Profile) => {
    setEditingMentor(mentor.id)
    setEditData({
      full_name: mentor.full_name || '',
      email: mentor.email,
      phone_number: (mentor as any).phone_number || '',
    })
  }

  const handleSave = async (mentorId: string) => {
    if (!editData) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editData.full_name || null,
          phone_number: editData.phone_number || null,
        })
        .eq('id', mentorId)

      if (error) throw error

      // Update email in auth if changed (via API)
      if (editData.email) {
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
    // Update updated_at to mark as active/inactive
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', mentorId)

      if (error) throw error

      loadMentors()
      alert('Mentor status updated')
    } catch (error: any) {
      alert(error.message || 'Failed to update mentor status')
    }
  }

  const filteredMentors = mentors.filter(mentor =>
    mentor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (mentor.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
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
                  value={editData?.full_name || ''}
                  onChange={(e) => setEditData({ ...editData!, full_name: e.target.value })}
                  placeholder="Full Name"
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
                      {mentor.full_name || 'No name'}
                    </h3>
                    <p className="text-sm text-[#d9d9d9]">{mentor.email}</p>
                    {(mentor as any).phone_number && (
                      <p className="text-xs text-[#d9d9d9]/70 mt-1">{(mentor as any).phone_number}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggleActive(mentor.id)}
                    className="p-2 text-green-400 hover:bg-[#272727] rounded transition"
                    title="Toggle active status"
                  >
                    <UserCheck className="w-4 h-4" />
                  </button>
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
    </div>
  )
}
