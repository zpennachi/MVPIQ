'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, BookOpen, LogOut, Menu, X, Settings, Lock, Shield, Users, School, UserCheck, MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import type { Profile } from '@/types/database'
import { Logo } from '@/components/ui/Logo'

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [hasPaid, setHasPaid] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        if (data) {
          setProfile(data as Profile)
          
          // Check payment status for players
          if (data.role === 'player') {
            const { data: payments } = await supabase
              .from('payments')
              .select('*')
              .eq('player_id', user.id)
              .eq('status', 'succeeded')
              .gte('amount', 5000)
            
            setHasPaid((payments?.length || 0) > 0)
          } else {
            // Non-players have access
            setHasPaid(true)
          }
        }
      }
    }
    getUser()
  }, [])

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (!user || !profile) return null

  const isActive = (path: string) => pathname === path

  const NavContent = () => (
    <>
      <div className="mb-8">
        <Logo height={36} variant="dark" />
      </div>

      <nav className="flex-1 space-y-2">
        <Link
          href="/dashboard"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
            isActive('/dashboard') && !isActive('/dashboard/one-on-ones') && !isActive('/dashboard/feedback')
              ? 'bg-[#ffc700] text-black'
              : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="font-medium">Home</span>
        </Link>

        {/* Player Navigation */}
        {profile.role === 'player' && (
          <>
            <Link
              href="/dashboard/one-on-ones"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                isActive('/dashboard/one-on-ones')
                  ? 'bg-[#ffc700] text-black'
                  : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span className="font-medium">One-on-Ones</span>
            </Link>
            <Link
              href="/dashboard/feedback"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                isActive('/dashboard/feedback')
                  ? 'bg-[#ffc700] text-black'
                  : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="font-medium">Gameplay Feedback</span>
            </Link>
          </>
        )}

        {/* Mentor Navigation */}
        {profile.role === 'mentor' && (
          <>
            <Link
              href="/dashboard/feedback"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                isActive('/dashboard/feedback')
                  ? 'bg-[#ffc700] text-black'
                  : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="font-medium">Feedback</span>
            </Link>
            <Link
              href="/dashboard/one-on-ones"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                isActive('/dashboard/one-on-ones')
                  ? 'bg-[#ffc700] text-black'
                  : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span className="font-medium">One-on-Ones</span>
            </Link>
          </>
        )}

        {/* Coach Navigation - Keep existing */}
        {profile.role === 'coach' && (
          <>
            <Link
              href="/dashboard/calendar"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                isActive('/dashboard/calendar')
                  ? 'bg-[#ffc700] text-black'
                  : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span className="font-medium">Book Session</span>
            </Link>
            <Link
              href="/dashboard/appointments"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                isActive('/dashboard/appointments')
                  ? 'bg-[#ffc700] text-black'
                  : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span className="font-medium">My Appointments</span>
            </Link>
          </>
        )}

        {profile.role === 'player' && !hasPaid ? (
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 opacity-50 cursor-not-allowed ${
              isActive('/dashboard/education')
                ? 'bg-[#272727] text-[#d9d9d9]'
                : 'text-[#d9d9d9]'
            }`}
            title="Complete a $50 payment to unlock Education content"
          >
            <Lock className="w-5 h-5" />
            <span className="font-medium">Education</span>
          </div>
        ) : (
          <Link
            href="/dashboard/education"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
              isActive('/dashboard/education')
                ? 'bg-[#ffc700] text-black'
                : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="font-medium">Education</span>
          </Link>
        )}

        <Link
          href="/dashboard/settings"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
            isActive('/dashboard/settings')
              ? 'bg-[#ffc700] text-black'
              : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">Settings</span>
        </Link>

        {profile.role === 'admin' && (
          <>
            <div className="pt-4 mt-4 border-t border-[#272727]">
              <p className="px-4 py-2 text-xs font-semibold text-[#d9d9d9]/70 uppercase tracking-wider">Admin</p>
            </div>
            <Link
              href="/dashboard/admin"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                isActive('/dashboard/admin') && !isActive('/dashboard/admin/users') && !isActive('/dashboard/admin/teams') && !isActive('/dashboard/admin/mentors')
                  ? 'bg-[#ffc700] text-black'
                  : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
              }`}
            >
              <Shield className="w-5 h-5" />
              <span className="font-medium">Admin Dashboard</span>
            </Link>
            <Link
              href="/dashboard/admin/users"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                isActive('/dashboard/admin/users')
                  ? 'bg-[#ffc700] text-black'
                  : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="font-medium">Users</span>
            </Link>
            <Link
              href="/dashboard/admin/teams"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                isActive('/dashboard/admin/teams')
                  ? 'bg-[#ffc700] text-black'
                  : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
              }`}
            >
              <School className="w-5 h-5" />
              <span className="font-medium">Teams</span>
            </Link>
            <Link
              href="/dashboard/admin/mentors"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                isActive('/dashboard/admin/mentors')
                  ? 'bg-[#ffc700] text-black'
                  : 'text-[#d9d9d9] hover:bg-[#272727] hover:text-white'
              }`}
            >
              <UserCheck className="w-5 h-5" />
              <span className="font-medium">Mentors</span>
            </Link>
          </>
        )}
      </nav>

      <div className="mt-auto pt-6 border-t border-[#272727]">
        <div className="px-4 py-2 mb-4">
          <p className="text-sm text-[#d9d9d9]">{profile.full_name || profile.email}</p>
          <p className="text-xs text-[#d9d9d9]/70 capitalize">{profile.role}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[#d9d9d9] hover:bg-[#272727] hover:text-white transition-all duration-300 active:scale-95"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Menu Button - Right Side */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-black border border-[#272727] rounded-lg text-[#ffc700] hover:bg-[#272727] transition-all duration-300 active:scale-95"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-70 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Hidden on mobile, shown on desktop */}
      <aside className="hidden lg:flex w-64 bg-black border-r border-[#272727] min-h-screen p-6 flex-col fixed left-0 top-0">
        <NavContent />
      </aside>

      {/* Mobile Menu - Slides in from left */}
      <aside
        className={`lg:hidden fixed left-0 top-0 h-full w-64 bg-black border-r border-[#272727] p-6 flex flex-col z-50 transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <NavContent />
      </aside>
    </>
  )
}
