'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'
import { Search, Edit, Trash2, UserCheck, UserX, Key, MoreVertical, UserPlus, X } from 'lucide-react'
import { format } from 'date-fns'
import { getFullName } from '@/lib/utils'

interface UserManagementProps {
  adminId: string
}

export function UserManagement({ adminId }: UserManagementProps) {
  const [users, setUsers] = useState<(Profile & { is_active?: boolean })[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<'all' | 'player'>('all')
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [editData, setEditData] = useState<{ first_name: string; last_name: string; email: string; phone_number: string; role: string } | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteData, setInviteData] = useState({ email: '', firstName: '', lastName: '', role: 'player' as 'player' })
  const [inviteLoading, setInviteLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadUsers()
  }, [adminId])

  const loadUsers = async () => {
    setLoading(true)
    try {
      // Use admin API endpoint to bypass RLS and get all users
      const response = await fetch('/api/admin/users')
      const result = await response.json()

      if (!response.ok) {
        console.error('Error loading users:', result.error)
        setUsers([])
        return
      }

      const data = result.users || []
      console.log('Loaded users:', { count: result.count, usersFound: data.length })

      // Filter to only show players
      const playersOnly = data.filter((user: Profile) => user.role === 'player')
      
      // Map users with is_active status (default to true if not set)
      const usersWithStatus = playersOnly.map((user: Profile) => ({
        ...user,
        is_active: (user as any).is_active !== false, // Default to true if not set
      }))

      setUsers(usersWithStatus as any)
    } catch (error) {
      console.error('Error loading users:', error)
      // Set empty array on error so UI still renders
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (user: Profile) => {
    setEditingUser(user.id)
    setEditData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email,
      phone_number: (user as any).phone_number || '',
      role: user.role,
    })
  }

  const handleSave = async (userId: string) => {
    if (!editData) return

    // Find the original user data to compare changes
    const originalUser = users.find(u => u.id === userId)
    if (!originalUser) return

    // Check if role is changing
    const roleChanged = originalUser.role !== editData.role
    const emailChanged = originalUser.email !== editData.email

    // Build confirmation message
    let confirmMessage = 'Are you sure you want to update this user?'
    if (roleChanged) {
      confirmMessage += `\n\n⚠️ Role will change from "${originalUser.role}" to "${editData.role}". This may affect their access permissions.`
    }
    if (emailChanged) {
      confirmMessage += `\n\n⚠️ Email will change from "${originalUser.email}" to "${editData.email}".`
    }

    if (!confirm(confirmMessage)) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: editData.first_name?.trim() || null,
          last_name: editData.last_name?.trim() || null,
          phone_number: editData.phone_number || null,
          role: editData.role as any,
        })
        .eq('id', userId)

      if (error) throw error

      // Update email in auth if changed (via API)
      if (editData.email && emailChanged) {
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
    const user = users.find(u => u.id === userId)
    const userName = getFullName(user) || user?.email || 'this user'
    const action = currentStatus ? 'deactivate' : 'activate'
    
    if (!confirm(`Are you sure you want to ${action} ${userName}?`)) return

    try {
      const response = await fetch('/api/admin/toggle-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isActive: !currentStatus }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user status')
      }

      loadUsers()
      alert(data.message || `User ${currentStatus ? 'deactivated' : 'activated'} successfully`)
    } catch (error: any) {
      alert(error.message || 'Failed to update user status')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    const user = users.find(u => u.id === userId)
    const userName = getFullName(user) || user?.email || 'this user'
    
    if (!confirm(`⚠️ WARNING: Are you sure you want to PERMANENTLY DELETE ${userName}?\n\nThis action cannot be undone and will delete all associated data.`)) return

    try {
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user')
      }

      loadUsers()
      alert('User deleted successfully')
    } catch (error: any) {
      alert(error.message || 'Failed to delete user')
    }
  }

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const confirmMessage = `Are you sure you want to invite ${inviteData.email} as a player?\n\nThey will receive an email with login instructions.`
    
    if (!confirm(confirmMessage)) return

    setInviteLoading(true)

    try {
      const response = await fetch('/api/admin/invite-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to invite user')
      }

      alert(data.message || 'Player invited successfully!')
      setShowInviteModal(false)
      setInviteData({ email: '', firstName: '', lastName: '', role: 'player' })
      loadUsers()
    } catch (error: any) {
      alert(error.message || 'Failed to invite user')
    } finally {
      setInviteLoading(false)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (getFullName(user).toLowerCase().includes(searchTerm.toLowerCase()) || false)
    
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
            <h2 className="text-xl sm:text-2xl font-bold text-white">Player Management</h2>
            <p className="text-sm text-[#d9d9d9] mt-1">Manage all player accounts</p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 bg-[#ffc700] text-black rounded-md hover:bg-[#e6b300] transition-all duration-300 active:scale-95 hover:shadow-lg flex items-center gap-2 font-medium relative z-10"
            type="button"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Invite Player</span>
            <span className="sm:hidden">Invite</span>
          </button>
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
          <option value="all">All Players</option>
          <option value="player">Active Players</option>
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
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={editData?.first_name || ''}
                            onChange={(e) => setEditData({ ...editData!, first_name: e.target.value })}
                            placeholder="First Name"
                            className="w-full px-2 py-1 text-sm border border-[#ffc700] rounded bg-black text-white"
                          />
                          <input
                            type="text"
                            value={editData?.last_name || ''}
                            onChange={(e) => setEditData({ ...editData!, last_name: e.target.value })}
                            placeholder="Last Name"
                            className="w-full px-2 py-1 text-sm border border-[#ffc700] rounded bg-black text-white"
                          />
                        </div>
                        <input
                          type="email"
                          value={editData?.email || ''}
                          onChange={(e) => setEditData({ ...editData!, email: e.target.value })}
                          placeholder="Email"
                          className="w-full px-2 py-1 text-sm border border-[#ffc700] rounded bg-black text-white mt-1"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded text-xs bg-[#272727] text-[#d9d9d9]">
                          Player
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
                          <p className="font-medium text-white">{getFullName(user) || 'No name'}</p>
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
                          {user.is_active ? (
                            <button
                              onClick={() => handleToggleActive(user.id, true)}
                              className="p-2 text-red-400 hover:bg-[#272727] rounded transition"
                              title="Deactivate"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleToggleActive(user.id, false)}
                                className="p-2 text-green-400 hover:bg-[#272727] rounded transition"
                                title="Reactivate"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="p-2 text-red-500 hover:bg-[#272727] rounded transition"
                                title="Delete permanently"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
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
            <p className="text-[#d9d9d9]">No players found</p>
          </div>
        )}
      </div>

      <div className="text-sm text-[#d9d9d9]">
        Showing {filteredUsers.length} of {users.length} players
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
          <div className="bg-black border border-[#272727] rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Invite Player</h3>
              <button
                onClick={() => {
                  setShowInviteModal(false)
                  setInviteData({ email: '', firstName: '', lastName: '', role: 'player' })
                }}
                className="text-[#d9d9d9] hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInviteUser} className="space-y-4">
              <input type="hidden" value="player" />
              <p className="text-sm text-[#d9d9d9]/70 mb-4">
                Inviting a new player account. They will receive an email with login instructions.
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
                  placeholder="user@example.com"
                />
              </div>

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
                    setInviteData({ email: '', firstName: '', lastName: '', role: 'player' })
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
