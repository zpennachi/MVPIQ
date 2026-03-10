'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import { Users, UserCheck, School, MessageSquare, DollarSign, Calendar, TrendingUp, FileEdit, BookOpen } from 'lucide-react'
import Link from 'next/link'

interface AdminDashboardProps {
  adminId: string
  hideHeader?: boolean
  isCompactView?: boolean
}

export function AdminDashboard({ adminId, hideHeader, isCompactView }: AdminDashboardProps) {
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
      {!hideHeader && (
        <div className="dotted-bg-subtle rounded-lg p-4 -m-4 sm:-m-6 lg:-m-8 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="mt-2 text-sm sm:text-base text-[#d9d9d9]">
            Manage users, teams, mentors, and platform operations
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className={`grid grid-cols-2 ${isCompactView ? 'xl:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-4'} gap-3 sm:gap-4`}>
        <Link href="/dashboard/admin/users" className="bg-black border border-[#272727] rounded-lg p-4 sm:p-5 hover:border-[#ffc700]/40 transition flex flex-col justify-between">
          <div className="flex items-start justify-between mb-2 gap-2">
            <p className="text-xs sm:text-sm text-[#d9d9d9] leading-tight">Total Users</p>
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-[#ffc700] flex-shrink-0" />
          </div>
          <div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-none">{stats.totalUsers}</p>
            <p className="text-[10px] sm:text-xs text-[#d9d9d9]/70 mt-1 sm:mt-2 truncate">{stats.activeUsers} active</p>
          </div>
        </Link>

        {/* Temporarily hidden until client is ready
        <Link href="/dashboard/admin/teams" className="bg-black border border-[#272727] rounded-lg p-4 sm:p-5 hover:border-[#ffc700]/40 transition flex flex-col justify-between">
          <div className="flex items-start justify-between mb-2 gap-2">
            <p className="text-xs sm:text-sm text-[#d9d9d9] leading-tight">Teams/Schools</p>
            <School className="w-4 h-4 sm:w-5 sm:h-5 text-[#ffc700] flex-shrink-0" />
          </div>
          <div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-none">{stats.totalTeams}</p>
          </div>
        </Link>
        */}

        <Link href="/dashboard/admin/mentors" className="bg-black border border-[#272727] rounded-lg p-4 sm:p-5 hover:border-[#ffc700]/40 transition flex flex-col justify-between">
          <div className="flex items-start justify-between mb-2 gap-2">
            <p className="text-xs sm:text-sm text-[#d9d9d9] leading-tight">Mentors</p>
            <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-[#ffc700] flex-shrink-0" />
          </div>
          <div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-none">{stats.totalMentors}</p>
          </div>
        </Link>

        <div className="bg-black border border-[#272727] rounded-lg p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between mb-2 gap-2">
            <p className="text-xs sm:text-sm text-[#d9d9d9] leading-tight">Total Revenue</p>
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 flex-shrink-0" />
          </div>
          <div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-400 leading-none">${stats.totalRevenue.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-black border border-[#272727] rounded-lg p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between mb-2 gap-2">
            <p className="text-xs sm:text-sm text-[#d9d9d9] leading-tight">Feedback Submissions</p>
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-[#ffc700] flex-shrink-0" />
          </div>
          <div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-none">{stats.totalSubmissions}</p>
          </div>
        </div>

        <div className="bg-black border border-[#272727] rounded-lg p-4 sm:p-5 flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-start justify-between mb-2 gap-2">
            <p className="text-xs sm:text-sm text-[#d9d9d9] leading-tight">Upcoming Sessions</p>
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-[#ffc700] flex-shrink-0" />
          </div>
          <div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-none">{stats.upcomingSessions}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-black border border-[#272727] rounded-lg p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-x-auto pb-4 sm:pb-0 snap-x hide-scrollbar">
          <Link
            href="/dashboard/admin/users"
            className="min-w-[200px] sm:min-w-0 snap-start p-4 bg-[#272727]/50 border border-[#272727] rounded-lg hover:border-[#ffc700]/40 transition flex-shrink-0"
          >
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-[#ffc700] mb-2" />
            <h3 className="font-semibold text-white mb-1 text-sm sm:text-base">Manage Users</h3>
            <p className="text-xs sm:text-sm text-[#d9d9d9] line-clamp-2">View, edit, and manage all user accounts</p>
          </Link>

          {/* Temporarily hidden until client is ready
          <Link
            href="/dashboard/admin/teams"
            className="min-w-[200px] sm:min-w-0 snap-start p-4 bg-[#272727]/50 border border-[#272727] rounded-lg hover:border-[#ffc700]/40 transition flex-shrink-0"
          >
            <School className="w-5 h-5 sm:w-6 sm:h-6 text-[#ffc700] mb-2" />
            <h3 className="font-semibold text-white mb-1 text-sm sm:text-base">Manage Teams</h3>
            <p className="text-xs sm:text-sm text-[#d9d9d9] line-clamp-2">View and manage all teams and schools</p>
          </Link>
          */}

          <Link
            href="/dashboard/admin/mentors"
            className="min-w-[200px] sm:min-w-0 snap-start p-4 bg-[#272727]/50 border border-[#272727] rounded-lg hover:border-[#ffc700]/40 transition flex-shrink-0"
          >
            <UserCheck className="w-5 h-5 sm:w-6 sm:h-6 text-[#ffc700] mb-2" />
            <h3 className="font-semibold text-white mb-1 text-sm sm:text-base">Manage Mentors</h3>
            <p className="text-xs sm:text-sm text-[#d9d9d9] line-clamp-2">View and manage all mentor accounts</p>
          </Link>

          <Link
            href="/dashboard/admin/homepage"
            className="min-w-[200px] sm:min-w-0 snap-start p-4 bg-[#272727]/50 border border-[#272727] rounded-lg hover:border-[#ffc700]/40 transition flex-shrink-0"
          >
            <FileEdit className="w-5 h-5 sm:w-6 sm:h-6 text-[#ffc700] mb-2" />
            <h3 className="font-semibold text-white mb-1 text-sm sm:text-base">Homepage Editor</h3>
            <p className="text-xs sm:text-sm text-[#d9d9d9] line-clamp-2">Edit homepage content and rearrange sections</p>
          </Link>

          <Link
            href="/dashboard/admin/education"
            className="min-w-[200px] sm:min-w-0 snap-start p-4 bg-[#272727]/50 border border-[#272727] rounded-lg hover:border-[#ffc700]/40 transition flex-shrink-0"
          >
            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-[#ffc700] mb-2" />
            <h3 className="font-semibold text-white mb-1 text-sm sm:text-base">Education Videos</h3>
            <p className="text-xs sm:text-sm text-[#d9d9d9] line-clamp-2">Upload and manage educational videos</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
