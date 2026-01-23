'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'
import { ChevronDown, LogOut, Settings, LayoutDashboard } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { getFullName, getFirstName, getInitials as getProfileInitials } from '@/lib/utils'

export function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        if (!error && data) {
          setProfile(data)
        }
      }
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data, error }) => {
            if (!error && data) {
              setProfile(data)
            }
          })
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setShowDropdown(false)
    router.push('/')
    router.refresh()
  }

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, anchor: string) => {
    e.preventDefault()
    if (pathname !== '/') {
      router.push(`/#${anchor}`)
      // Wait for navigation, then scroll
      setTimeout(() => {
        const element = document.getElementById(anchor)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    } else {
      const element = document.getElementById(anchor)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown])


  if (loading) {
    return (
      <nav className="bg-black border-b border-[#272727] shadow-mvp">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="flex items-center">
              <Logo height={32} variant="dark" />
            </Link>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/" className="flex items-center">
            <Logo height={40} variant="light" />
          </Link>

          <div className="flex items-center gap-6">
            {!user ? (
              <>
                <a
                  href="#pros"
                  onClick={(e) => handleAnchorClick(e, 'pros')}
                  className="text-sm font-medium text-gray-900 hover:text-[#ffc700] transition-all duration-300"
                >
                  Pros
                </a>
                <a
                  href="#platform"
                  onClick={(e) => handleAnchorClick(e, 'platform')}
                  className="text-sm font-medium text-gray-900 hover:text-[#ffc700] transition-all duration-300"
                >
                  Platform
                </a>
                <a
                  href="#insights"
                  onClick={(e) => handleAnchorClick(e, 'insights')}
                  className="text-sm font-medium text-gray-900 hover:text-[#ffc700] transition-all duration-300"
                >
                  Insights
                </a>
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-900 hover:text-[#ffc700] transition-all duration-300"
                >
                  Log In
                </Link>
              </>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-900 hover:text-[#ffc700] transition-all duration-300"
                >
                  {(profile as any)?.profile_photo_url ? (
                    <img
                      src={(profile as any).profile_photo_url}
                      alt={getFullName(profile) || 'Profile'}
                      className="w-8 h-8 rounded-full object-cover border-2 border-gray-300"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#ffc700]/20 border-2 border-gray-300 flex items-center justify-center">
                      <span className="text-xs font-bold text-[#ffc700]">
                        {getProfileInitials(profile)}
                      </span>
                    </div>
                  )}
                  <span className="hidden sm:inline">{getFirstName(profile) || profile?.email?.split('@')[0] || 'User'}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <Link
                      href="/dashboard"
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-all duration-300"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Link>
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-all duration-300"
                    >
                      <Settings className="w-4 h-4" />
                      Account Settings
                    </Link>
                    <div className="border-t border-gray-200 my-1"></div>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-all duration-300 text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
