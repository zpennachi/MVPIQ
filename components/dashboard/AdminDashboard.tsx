'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import { Users, UserCheck, School, MessageSquare, DollarSign, Calendar, TrendingUp, FileEdit, BookOpen } from 'lucide-react'
import Link from 'next/link'

interface AdminDashboardProps {
  adminId: string
}

export function AdminDashboard({ adminId }: AdminDashboardProps) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalTeams: 0,
    totalMentors: 0,
    totalSubmissions: 0,
    totalRevenue: 0,
    upcomingSessions: 0,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadStats()
    // Automatically refresh OAuth tokens on login/load
    refreshOAuthTokens()
  }, [adminId])

  const refreshOAuthTokens = async () => {
    try {
      // Silently refresh OAuth tokens - don't show errors to user
      const response = await fetch('/api/calendar/oauth/refresh', {
        method: 'POST',
      })
      const result = await response.json()
      
      if (result.success) {
        console.log('✅ OAuth tokens refreshed automatically on login')
      } else {
        // Only log, don't show error - user can manually reconnect if needed
        console.log('OAuth token refresh skipped:', result.message)
      }
    } catch (error) {
      // Silently fail - don't interrupt user experience
      console.log('OAuth token refresh failed silently:', error)
    }
  }

  const loadStats = async () => {
    setLoading(true)
    
    try {
      // Use admin API endpoint to bypass RLS
      const response = await fetch('/api/admin/stats')
      const result = await response.json()

      if (!response.ok) {
        console.error('Error loading stats:', result.error)
        return
      }

      setStats(result.stats)
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-[#272727] rounded w-1/3 animate-pulse"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="dotted-bg-subtle rounded-lg p-4 -m-4 sm:-m-6 lg:-m-8 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Admin Dashboard</h1>
        <p className="mt-2 text-sm sm:text-base text-[#d9d9d9]">
          Manage users, teams, mentors, and platform operations
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/dashboard/admin/users" className="bg-black border border-[#272727] rounded-lg p-4 sm:p-6 hover:border-[#ffc700]/40 transition">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-[#d9d9d9]">Total Users</p>
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-[#ffc700]" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-white">{stats.totalUsers}</p>
          <p className="text-xs text-[#d9d9d9]/70 mt-1">{stats.activeUsers} active (30 days)</p>
        </Link>

        {/* Temporarily hidden until client is ready
        <Link href="/dashboard/admin/teams" className="bg-black border border-[#272727] rounded-lg p-4 sm:p-6 hover:border-[#ffc700]/40 transition">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-[#d9d9d9]">Teams/Schools</p>
            <School className="w-5 h-5 sm:w-6 sm:h-6 text-[#ffc700]" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-white">{stats.totalTeams}</p>
        </Link>
        */}

        <Link href="/dashboard/admin/mentors" className="bg-black border border-[#272727] rounded-lg p-4 sm:p-6 hover:border-[#ffc700]/40 transition">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-[#d9d9d9]">Mentors</p>
            <UserCheck className="w-5 h-5 sm:w-6 sm:h-6 text-[#ffc700]" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-white">{stats.totalMentors}</p>
        </Link>

        <div className="bg-black border border-[#272727] rounded-lg p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-[#d9d9d9]">Total Revenue</p>
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-green-400">${stats.totalRevenue.toFixed(2)}</p>
        </div>

        <div className="bg-black border border-[#272727] rounded-lg p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-[#d9d9d9]">Feedback Submissions</p>
            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-[#ffc700]" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-white">{stats.totalSubmissions}</p>
        </div>

        <div className="bg-black border border-[#272727] rounded-lg p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-[#d9d9d9]">Upcoming Sessions</p>
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-[#ffc700]" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-white">{stats.upcomingSessions}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-black border border-[#272727] rounded-lg p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/dashboard/admin/users"
            className="p-4 bg-[#272727]/50 border border-[#272727] rounded-lg hover:border-[#ffc700]/40 transition"
          >
            <Users className="w-6 h-6 text-[#ffc700] mb-2" />
            <h3 className="font-semibold text-white mb-1">Manage Users</h3>
            <p className="text-sm text-[#d9d9d9]">View, edit, and manage all user accounts</p>
          </Link>

          {/* Temporarily hidden until client is ready
          <Link
            href="/dashboard/admin/teams"
            className="p-4 bg-[#272727]/50 border border-[#272727] rounded-lg hover:border-[#ffc700]/40 transition"
          >
            <School className="w-6 h-6 text-[#ffc700] mb-2" />
            <h3 className="font-semibold text-white mb-1">Manage Teams</h3>
            <p className="text-sm text-[#d9d9d9]">View and manage all teams and schools</p>
          </Link>
          */}

          <Link
            href="/dashboard/admin/mentors"
            className="p-4 bg-[#272727]/50 border border-[#272727] rounded-lg hover:border-[#ffc700]/40 transition"
          >
            <UserCheck className="w-6 h-6 text-[#ffc700] mb-2" />
            <h3 className="font-semibold text-white mb-1">Manage Mentors</h3>
            <p className="text-sm text-[#d9d9d9]">View and manage all mentor accounts</p>
          </Link>

          <Link
            href="/dashboard/admin/homepage"
            className="p-4 bg-[#272727]/50 border border-[#272727] rounded-lg hover:border-[#ffc700]/40 transition"
          >
            <FileEdit className="w-6 h-6 text-[#ffc700] mb-2" />
            <h3 className="font-semibold text-white mb-1">Homepage Editor</h3>
            <p className="text-sm text-[#d9d9d9]">Edit homepage content and rearrange sections</p>
          </Link>

          <Link
            href="/dashboard/admin/education"
            className="p-4 bg-[#272727]/50 border border-[#272727] rounded-lg hover:border-[#ffc700]/40 transition"
          >
            <BookOpen className="w-6 h-6 text-[#ffc700] mb-2" />
            <h3 className="font-semibold text-white mb-1">Education Videos</h3>
            <p className="text-sm text-[#d9d9d9]">Upload and manage educational videos</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
