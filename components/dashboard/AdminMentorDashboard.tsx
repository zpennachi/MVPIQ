'use client'

import { MentorDashboard } from '@/components/dashboard/MentorDashboard'
import { AdminDashboard } from '@/components/dashboard/AdminDashboard'
import { ShieldAlert } from 'lucide-react'

interface AdminMentorDashboardProps {
  userId: string
}

export function AdminMentorDashboard({ userId }: AdminMentorDashboardProps) {
  return (
    <div className="flex flex-col xl:flex-row gap-6 xl:gap-8">
      {/* Mentor functionality (personalized header, feedback, sessions) */}
      <div className="flex-1 min-w-0">
        <MentorDashboard mentorId={userId} />
      </div>

      {/* Admin functionality */}
      <div className="flex-1 min-w-0 pt-6 border-t border-[#272727] xl:pt-0 xl:border-t-0 xl:border-l xl:pl-8">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <div className="w-10 h-10 bg-red-900/10 rounded-lg flex items-center justify-center border border-red-800/30">
            <ShieldAlert className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">Admin Controls</h2>
            <p className="text-xs sm:text-sm text-[#d9d9d9]">Platform-wide management and statistics</p>
          </div>
        </div>
        
        <AdminDashboard adminId={userId} hideHeader={true} isCompactView={true} />
      </div>
    </div>
  )
}
