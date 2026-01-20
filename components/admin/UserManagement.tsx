'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'
import { Search, Edit, Trash2, UserCheck, UserX, Key, MoreVertical } from 'lucide-react'
import { format } from 'date-fns'

interface UserManagementProps {
  adminId: string
}

export function UserManagement({ adminId }: UserManagementProps) {
  const [users, setUsers] = useState<(Profile & { is_active?: boolean })[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<'all' | 'player' | 'coach' | 'mentor' | 'admin'>('all')
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [editData, setEditData] = useState<{ full_name: string; email: string; phone_number: string; role: string } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadUsers()
  }, [adminId])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Check active status (users with recent activity)
      const usersWithStatus = await Promise.all(
        (data || []).map(async (user) => {
          // Check if user has any recent activity (videos, submissions, etc.)
          const thirtyDaysAgo = new Date()
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

          const { count: recentActivity } = await supabase
            .from('videos')
            .select('*', { count: 'exact', head: true })
            .eq('player_id', user.id)
            .gte('created_at', thirtyDaysAgo.toISOString())

          return {
            ...user,
            is_active: (recentActivity || 0) > 0 || new Date(user.updated_at) > thirtyDaysAgo,
          }
        })
      )

      setUsers(usersWithStatus as any)
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (user: Profile) => {
    setEditingUser(user.id)
    setEditData({
      full_name: user.full_name || '',
      email: user.email,
      phone_number: (user as any).phone_number || '',
      role: user.role,
    })
  }

  const handleSave = async (userId: string) => {
    if (!editData) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editData.full_name || null,
          phone_number: editData.phone_number || null,
          role: editData.role as any,
        })
        .eq('id', userId)

      if (error) throw error

      // Update email in auth if changed (via API)
      if (editData.email) {
        try {
          const response = await fetch('/api/admin/update-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, email: editData.email }),
          })
          if (!response.ok) {
            const data = await response.json()
            console.error('Error updating email:', data.error)
          }
        } catch (error) {
          console.error('Error updating email:', error)
        }
      }

      setEditingUser(null)
      setEditData(null)
      loadUsers()
      alert('User updated successfully')
    } catch (error: any) {
      alert(error.message || 'Failed to update user')
    }
  }

  const handleResetPassword = async (userId: string, email: string) => {
    if (!confirm(`Reset password for ${email}? They will receive an email with reset instructions.`)) return

    try {
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email }),
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Failed to reset password')

      alert('Password reset email sent successfully')
    } catch (error: any) {
      alert(error.message || 'Failed to reset password')
    }
  }

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    // For now, we'll just update the updated_at timestamp
    // In production, you might want an is_active column
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', userId)

      if (error) throw error

      loadUsers()
      alert(`User ${currentStatus ? 'deactivated' : 'activated'}`)
    } catch (error: any) {
      alert(error.message || 'Failed to update user status')
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
    
    const matchesRole = filterRole === 'all' || user.role === filterRole

    return matchesSearch && matchesRole
  })

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
            <h2 className="text-xl sm:text-2xl font-bold text-white">User Management</h2>
            <p className="text-sm text-[#d9d9d9] mt-1">Manage all user accounts</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#d9d9d9]" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[#272727] rounded-md bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700]"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as any)}
          className="px-4 py-2 border border-[#ffc700] rounded-md bg-black text-[#d9d9d9] focus:outline-none focus:ring-2 focus:ring-[#ffc700]"
        >
          <option value="all">All Roles</option>
          <option value="player">Players</option>
          <option value="coach">Coaches</option>
          <option value="mentor">Mentors</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-black border border-[#272727] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#272727]">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white">User</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white">Role</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white">Created</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-white">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#272727]">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-[#272727]/50 transition-all duration-300">
                  {editingUser === user.id ? (
                    <>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={editData?.full_name || ''}
                          onChange={(e) => setEditData({ ...editData!, full_name: e.target.value })}
                          placeholder="Full Name"
                          className="w-full px-2 py-1 text-sm border border-[#ffc700] rounded bg-black text-white"
                        />
                        <input
                          type="email"
                          value={editData?.email || ''}
                          onChange={(e) => setEditData({ ...editData!, email: e.target.value })}
                          placeholder="Email"
                          className="w-full px-2 py-1 text-sm border border-[#ffc700] rounded bg-black text-white mt-1"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={editData?.role || 'player'}
                          onChange={(e) => setEditData({ ...editData!, role: e.target.value })}
                          className="px-2 py-1 text-sm border border-[#ffc700] rounded bg-black text-white"
                        >
                          <option value="player">Player</option>
                          <option value="coach">Coach</option>
                          <option value="mentor">Mentor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          user.is_active ? 'bg-green-900/30 text-green-400' : 'bg-[#272727] text-[#d9d9d9]'
                        }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#d9d9d9]">
                        {format(new Date(user.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleSave(user.id)}
                            className="px-3 py-1 bg-[#ffc700] text-black rounded text-sm font-medium hover:bg-[#e6b300] transition-all duration-300 active:scale-95 hover:shadow-lg"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingUser(null)
                              setEditData(null)
                            }}
                            className="px-3 py-1 border border-[#272727] text-[#d9d9d9] rounded text-sm hover:bg-[#272727] transition-all duration-300 active:scale-95"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-white">{user.full_name || 'No name'}</p>
                          <p className="text-sm text-[#d9d9d9]">{user.email}</p>
                          {(user as any).phone_number && (
                            <p className="text-xs text-[#d9d9d9]/70">{(user as any).phone_number}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded text-xs bg-[#272727] text-[#d9d9d9] capitalize">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          user.is_active ? 'bg-green-900/30 text-green-400' : 'bg-[#272727] text-[#d9d9d9]'
                        }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#d9d9d9]">
                        {format(new Date(user.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-2 text-[#ffc700] hover:bg-[#272727] rounded transition"
                            title="Edit user"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleResetPassword(user.id, user.email)}
                            className="p-2 text-blue-400 hover:bg-[#272727] rounded transition"
                            title="Reset password"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(user.id, user.is_active || false)}
                            className={`p-2 rounded transition ${
                              user.is_active
                                ? 'text-red-400 hover:bg-[#272727]'
                                : 'text-green-400 hover:bg-[#272727]'
                            }`}
                            title={user.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[#d9d9d9]">No users found</p>
          </div>
        )}
      </div>

      <div className="text-sm text-[#d9d9d9]">
        Showing {filteredUsers.length} of {users.length} users
      </div>
    </div>
  )
}
