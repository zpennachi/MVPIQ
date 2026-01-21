'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { BookSession } from '@/components/calendar/BookSession'
import { MyAppointments } from '@/components/calendar/MyAppointments'
import { MentorAvailability } from '@/components/calendar/MentorAvailability'

interface OneOnOnesClientProps {
  userId: string
  userRole: 'player' | 'coach' | 'mentor' | 'admin'
}

export function OneOnOnesClient({ userId, userRole }: OneOnOnesClientProps) {
  const searchParams = useSearchParams()
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Get active tab from URL params, default based on role
  const getInitialTab = () => {
    const tab = searchParams?.get('tab')
    if (userRole === 'mentor') {
      return tab === 'upcoming' ? 'upcoming' : 'availability'
    }
    return tab === 'appointments' ? 'appointments' : 'book'
  }
  
  const [activeTab, setActiveTab] = useState<'book' | 'appointments' | 'availability' | 'upcoming'>(getInitialTab())

  // Update tab when URL params change
  useEffect(() => {
    const tab = searchParams?.get('tab')
    if (userRole === 'mentor') {
      setActiveTab(tab === 'upcoming' ? 'upcoming' : 'availability')
    } else {
      setActiveTab(tab === 'appointments' ? 'appointments' : 'book')
    }
  }, [searchParams, userRole])

  const handleBookingSuccess = () => {
    // Wait a moment for database to update, then refresh
    setTimeout(() => {
      // Trigger refresh of appointments
      setRefreshKey(prev => prev + 1)
      // Switch to appointments tab to show the new booking
      if (userRole !== 'mentor') {
        setActiveTab('appointments')
      } else {
        setActiveTab('upcoming')
      }
    }, 500) // Small delay to ensure database update completes
  }

  if (userRole === 'mentor') {
    return (
      <div className="space-y-6">
        {/* Tabs - Mobile only */}
        <div className="flex lg:hidden gap-2 border-b border-[#272727]">
          <button
            onClick={() => {
              setActiveTab('availability')
              window.history.pushState({}, '', '/dashboard/one-on-ones?tab=availability')
            }}
            className={`px-4 py-2 font-medium transition ${
              activeTab === 'availability'
                ? 'text-[#ffc700] border-b-2 border-[#ffc700]'
                : 'text-[#d9d9d9] hover:text-white'
            }`}
          >
            Availability
          </button>
          <button
            onClick={() => {
              setActiveTab('upcoming')
              window.history.pushState({}, '', '/dashboard/one-on-ones?tab=upcoming')
            }}
            className={`px-4 py-2 font-medium transition ${
              activeTab === 'upcoming'
                ? 'text-[#ffc700] border-b-2 border-[#ffc700]'
                : 'text-[#d9d9d9] hover:text-white'
            }`}
          >
            Upcoming Appointments
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'availability' && (
          <div className="bg-black border border-[#272727] rounded-lg shadow-mvp p-4 sm:p-6">
            <MentorAvailability mentorId={userId} />
          </div>
        )}

        {activeTab === 'upcoming' && (
          <div className="bg-black border border-[#272727] rounded-lg shadow-mvp p-4 sm:p-6">
            <MyAppointments key={refreshKey} userId={userId} userRole="mentor" />
          </div>
        )}
      </div>
    )
  }

  // Players and coaches
  return (
    <div className="space-y-6">
      {/* Tabs - Mobile only */}
      <div className="flex lg:hidden gap-2 border-b border-[#272727]">
        <button
          onClick={() => {
            setActiveTab('book')
            window.history.pushState({}, '', '/dashboard/one-on-ones?tab=book')
          }}
          className={`px-4 py-2 font-medium transition ${
            activeTab === 'book'
              ? 'text-[#ffc700] border-b-2 border-[#ffc700]'
              : 'text-[#d9d9d9] hover:text-white'
          }`}
        >
          Book an Appointment
        </button>
        <button
          onClick={() => {
            setActiveTab('appointments')
            window.history.pushState({}, '', '/dashboard/one-on-ones?tab=appointments')
          }}
          className={`px-4 py-2 font-medium transition ${
            activeTab === 'appointments'
              ? 'text-[#ffc700] border-b-2 border-[#ffc700]'
              : 'text-[#d9d9d9] hover:text-white'
          }`}
        >
          My Appointments
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'book' && (
        <BookSession 
          userId={userId} 
          userRole={userRole} 
          onBookingSuccess={handleBookingSuccess}
        />
      )}

      {activeTab === 'appointments' && (
        <MyAppointments key={refreshKey} userId={userId} />
      )}
    </div>
  )
}
