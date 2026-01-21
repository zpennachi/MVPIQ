'use client'

import { useState } from 'react'
import { BookSession } from '@/components/calendar/BookSession'
import { MyAppointments } from '@/components/calendar/MyAppointments'
import { MentorAvailability } from '@/components/calendar/MentorAvailability'

interface OneOnOnesClientProps {
  userId: string
  userRole: 'player' | 'coach' | 'mentor' | 'admin'
}

export function OneOnOnesClient({ userId, userRole }: OneOnOnesClientProps) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeTab, setActiveTab] = useState<'book' | 'appointments' | 'availability' | 'upcoming'>(
    userRole === 'mentor' ? 'availability' : 'book'
  )

  const handleBookingSuccess = () => {
    // Trigger refresh of appointments
    setRefreshKey(prev => prev + 1)
    // Switch to appointments tab to show the new booking
    if (userRole !== 'mentor') {
      setActiveTab('appointments')
    } else {
      setActiveTab('upcoming')
    }
  }

  if (userRole === 'mentor') {
    return (
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-[#272727]">
          <button
            onClick={() => setActiveTab('availability')}
            className={`px-4 py-2 font-medium transition ${
              activeTab === 'availability'
                ? 'text-[#ffc700] border-b-2 border-[#ffc700]'
                : 'text-[#d9d9d9] hover:text-white'
            }`}
          >
            Availability
          </button>
          <button
            onClick={() => setActiveTab('upcoming')}
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
      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#272727]">
        <button
          onClick={() => setActiveTab('book')}
          className={`px-4 py-2 font-medium transition ${
            activeTab === 'book'
              ? 'text-[#ffc700] border-b-2 border-[#ffc700]'
              : 'text-[#d9d9d9] hover:text-white'
          }`}
        >
          Book an Appointment
        </button>
        <button
          onClick={() => setActiveTab('appointments')}
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
