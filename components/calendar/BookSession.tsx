'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AvailabilitySlot, Profile, BookedSession } from '@/types/database'
import { Calendar, Clock, DollarSign, CreditCard } from 'lucide-react'
import { format, startOfWeek, addDays, eachDayOfInterval, addWeeks, subWeeks, isSameDay, parseISO, addMinutes } from 'date-fns'
import { expandRecurringSlots, type ExpandedSlot } from '@/lib/calendar/recurring-slots'

interface BookSessionProps {
  userId: string
  userRole: 'player' | 'coach' | 'admin'
}

type MentorWithSlots = {
  mentor: Profile
  slots: AvailabilitySlot[]
  expandedSlots?: ExpandedSlot[]
}

export function BookSession({ userId, userRole }: BookSessionProps) {
  const [mentors, setMentors] = useState<MentorWithSlots[]>([])
  const [selectedMentor, setSelectedMentor] = useState<Profile | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<ExpandedSlot | null>(null)
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [booking, setBooking] = useState(false)
  const [loading, setLoading] = useState(true)
  const [availableCredits, setAvailableCredits] = useState(0)
  const [loadingSlots, setLoadingSlots] = useState(false) // Prevent concurrent slot loads
  const supabase = createClient()

  // Memoize weekStart to prevent infinite loops - only recalculate when currentWeek changes
  const weekStart = useMemo(() => startOfWeek(currentWeek, { weekStartsOn: 1 }), [currentWeek])
  const weekDays = useMemo(() => eachDayOfInterval({
    start: weekStart,
    end: addDays(weekStart, 6),
  }), [weekStart])

  useEffect(() => {
    loadMentors()
    checkCredits()
  }, [currentWeek])

  const checkCredits = async () => {
    try {
      console.log('🔍 Checking for available credits...')
      const response = await fetch('/api/credits/check')
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Credits check result:', data)
        setAvailableCredits(data.availableCredits || 0)
        if (data.availableCredits > 0) {
          console.log(`💰 Found ${data.availableCredits} credit(s)!`)
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('❌ Failed to check credits:', errorData, 'Status:', response.status)
        setAvailableCredits(0)
      }
    } catch (error) {
      console.error('❌ Error checking credits:', error)
      setAvailableCredits(0)
    }
  }

  useEffect(() => {
    if (selectedMentor && !loadingSlots) {
      console.log('useEffect triggered: loading slots for', selectedMentor.id)
      loadMentorSlots(selectedMentor.id)
    }
    // Only depend on selectedMentor.id and weekStart (which is memoized from currentWeek)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMentor?.id, weekStart])

  const loadMentors = async () => {
    setLoading(true)
    try {
      const weekEnd = addDays(weekStart, 7)
      
      // First, get all mentors
      const { data: mentorProfiles, error: mentorError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'mentor')
        .order('full_name', { ascending: true })

      if (mentorError) {
        console.error('Error loading mentors:', mentorError)
        return
      }

      if (!mentorProfiles || mentorProfiles.length === 0) {
        setMentors([])
        return
      }

      // Get ALL availability slots (not filtered by date) - recurring slots might start before this week
      const { data: slots, error: slotsError } = await supabase
        .from('availability_slots')
        .select('*')
        .eq('is_active', true)
        .order('start_time', { ascending: true })

      if (slotsError) {
        console.error('Error loading slots:', slotsError)
      }

      // Group slots by mentor and create mentor list
      const mentorMap = new Map<string, { mentor: Profile; slots: AvailabilitySlot[]; expandedSlots?: ExpandedSlot[] }>()
      
      // Initialize all mentors with empty slots
      mentorProfiles.forEach((mentor: Profile) => {
        mentorMap.set(mentor.id, { mentor, slots: [] })
      })

      // Add slots to their respective mentors and expand recurring ones
      if (slots) {
        slots.forEach((slot: AvailabilitySlot) => {
          const mentorData = mentorMap.get(slot.mentor_id)
          if (mentorData) {
            mentorData.slots.push(slot)
          }
        })
        
        // Expand recurring slots for each mentor
        mentorMap.forEach((mentorData) => {
          if (mentorData.slots.length > 0) {
            const expanded = expandRecurringSlots(mentorData.slots, weekStart, weekEnd)
            mentorData.expandedSlots = expanded
          }
        })
      }

      const mentorsList = Array.from(mentorMap.values())
      setMentors(mentorsList)
      
      // Auto-select first mentor if none selected
      if (!selectedMentor && mentorsList.length > 0) {
        const firstMentor = mentorsList[0].mentor
        setSelectedMentor(firstMentor)
        // Load slots for the first mentor (will filter out booked ones)
        await loadMentorSlots(firstMentor.id)
      }
    } catch (error) {
      console.error('Error in loadMentors:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMentorSlots = async (mentorId: string) => {
    // Prevent concurrent loads
    if (loadingSlots) {
      console.log('Already loading slots, skipping...')
      return
    }
    
    setLoadingSlots(true)
    try {
      const weekEnd = addDays(weekStart, 7)
      console.log('Loading slots for mentor:', mentorId, 'Week:', weekStart.toISOString(), 'to', weekEnd.toISOString())
      
      // Load ALL active slots (not filtered by date) so we can expand recurring slots
      // Recurring slots might have started before this week but still apply to this week
      const { data: slots, error: slotsError } = await supabase
        .from('availability_slots')
        .select('*')
        .eq('mentor_id', mentorId)
        .eq('is_active', true)
        .order('start_time', { ascending: true })

      if (slotsError) {
        console.error('Error loading mentor slots:', slotsError)
        // Update mentor with empty slots on error
        setMentors(prev => prev.map(m => 
          m.mentor.id === mentorId ? { ...m, slots: [] } : m
        ))
        return
      }

      console.log('Found slots (before expansion):', slots?.length || 0, slots)
      if (slots && slots.length > 0) {
        console.log('Slot details:', slots.map(s => ({
          id: s.id,
          is_recurring: s.is_recurring,
          recurring_pattern: s.recurring_pattern,
          start_time: s.start_time,
          mentor_id: s.mentor_id
        })))
      }

      if (!slots || slots.length === 0) {
        // Update mentor with empty slots
        setMentors(prev => prev.map(m => 
          m.mentor.id === mentorId ? { ...m, slots: [], expandedSlots: [] } : m
        ))
        console.log('No slots found for mentor:', mentorId)
        return
      }

      // Expand recurring slots for this week - this will generate instances for daily/weekly/monthly patterns
      console.log('Expanding slots for week:', weekStart.toISOString(), 'to', weekEnd.toISOString())
      const expanded = expandRecurringSlots(slots, weekStart, weekEnd)
      console.log('Expanded slots for week:', expanded.length, expanded)

      // Get all original slot IDs (including recurring ones)
      const originalSlotIds = [...new Set(expanded.map(s => s.originalSlotId))]
      
      // Check which slots are already booked (check by original slot ID and specific time)
      const { data: bookings, error: bookingsError } = await supabase
        .from('booked_sessions')
        .select('availability_slot_id, start_time')
        .in('availability_slot_id', originalSlotIds)
        .in('status', ['pending', 'confirmed'])
        .gte('start_time', weekStart.toISOString())
        .lt('start_time', weekEnd.toISOString())

      if (bookingsError) {
        console.error('Error loading bookings:', bookingsError)
      }

      // Create a set of booked slot times (slot ID + start time)
      const bookedSlotTimes = new Set(
        bookings?.map(b => `${b.availability_slot_id}-${parseISO(b.start_time).toISOString()}`) || []
      )

      // Filter out booked slots
      const availableExpandedSlots = expanded.filter(slot => {
        const slotTimeKey = `${slot.originalSlotId}-${parseISO(slot.start_time).toISOString()}`
        return !bookedSlotTimes.has(slotTimeKey)
      })
      
      console.log('Available expanded slots after filtering:', availableExpandedSlots.length)
      
      // Update mentors state with both original and expanded slots
      // Only update if there's an actual change to prevent infinite loops
      setMentors(prev => {
        const existingMentor = prev.find(m => m.mentor.id === mentorId)
        
        // Check if update is needed (prevent unnecessary re-renders)
        if (existingMentor) {
          const slotsChanged = existingMentor.slots.length !== slots.length ||
            existingMentor.slots.some((s, i) => s.id !== slots[i]?.id)
          const expandedChanged = existingMentor.expandedSlots?.length !== availableExpandedSlots.length ||
            existingMentor.expandedSlots?.some((s, i) => s.start_time !== availableExpandedSlots[i]?.start_time)
          
          if (!slotsChanged && !expandedChanged) {
            console.log('No changes detected, skipping state update to prevent loop')
            return prev // Return previous state to prevent re-render
          }
        }
        
        const updated = prev.map(m => 
          m.mentor.id === mentorId 
            ? { ...m, slots: slots as AvailabilitySlot[], expandedSlots: availableExpandedSlots } 
            : m
        )
        console.log('Updated mentors state:', updated.map(m => ({ id: m.mentor.id, originalSlots: m.slots.length, expandedSlots: m.expandedSlots?.length || 0 })))
        return updated
      })
    } catch (error) {
      console.error('Error in loadMentorSlots:', error)
    } finally {
      setLoadingSlots(false)
    }
  }

  const getSlotsForDay = (day: Date, mentorExpandedSlots?: ExpandedSlot[]) => {
    if (!mentorExpandedSlots || mentorExpandedSlots.length === 0) {
      return []
    }
    return mentorExpandedSlots.filter(slot => {
      try {
        const slotDate = parseISO(slot.start_time)
        return isSameDay(slotDate, day)
      } catch (error) {
        console.error('Error parsing slot date:', slot.start_time, error)
        return false
      }
    })
  }

  const formatTime = (dateString: string) => {
    return format(parseISO(dateString), 'h:mm a')
  }

  const handleBookSlot = async (slot: ExpandedSlot) => {
    setSelectedSlot(slot)
    // Refresh credits before showing modal
    await checkCredits()
    setShowPaymentModal(true)
  }

  const handleConfirmBooking = async () => {
    if (!selectedSlot || !selectedMentor) return

    setBooking(true)

    try {
      // Create booking using the original slot ID (for recurring slots)
      const startTime = parseISO(selectedSlot.start_time)
      const endTime = parseISO(selectedSlot.end_time)
      
      const { data: session, error: sessionError } = await supabase
        .from('booked_sessions')
        .insert({
          availability_slot_id: selectedSlot.originalSlotId,
          mentor_id: selectedMentor.id,
          user_id: userId,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: 'pending',
          payment_status: 'pending',
        })
        .select()
        .single()

      if (sessionError) throw sessionError

      // Check if user has available credits
      if (availableCredits > 0) {
        // Use credit for this booking
        const creditResponse = await fetch('/api/credits/use', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: session.id,
          }),
        })

        if (creditResponse.ok) {
          // Credit applied successfully - confirm session without payment
          const { error: updateError } = await supabase
            .from('booked_sessions')
            .update({
              payment_status: 'completed',
              status: 'confirmed',
              payment_intent_id: `credit_${Date.now()}`,
            })
            .eq('id', session.id)

          if (updateError) throw updateError

          // Send confirmation emails
          await fetch('/api/sessions/payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: session.id,
              amount: 0, // Free with credit
              useCredit: true,
            }),
          })

          alert('✅ Session booked using credit! No payment required.')
          setShowPaymentModal(false)
          setSelectedSlot(null)
          // Refresh credit count immediately
          await checkCredits()
          loadMentors()
          return
        } else {
          // Credit use failed, fall through to payment
          console.warn('Failed to use credit, proceeding with payment')
        }
      }

      // No credits available or credit use failed - proceed with payment
      const response = await fetch('/api/sessions/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          amount: 15000, // $150 in cents
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Delete session if payment fails
        await supabase.from('booked_sessions').delete().eq('id', session.id)
        throw new Error(data.error || 'Payment failed')
      }

      // Redirect to Stripe Checkout if URL provided
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else if (data.devMode) {
        // Dev mode: Payment skipped
        alert('✅ Dev Mode: Session booked! Payment skipped.')
        setShowPaymentModal(false)
        setSelectedSlot(null)
        loadMentors()
      }
    } catch (error: any) {
      alert('Failed to book session: ' + error.message)
    } finally {
      setBooking(false)
    }
  }

  const selectedMentorData = selectedMentor ? mentors.find(m => m.mentor.id === selectedMentor.id) : null
  
  // Debug log
  console.log('Render - selectedMentor:', selectedMentor?.id, 'selectedMentorData found:', !!selectedMentorData, 'mentors count:', mentors.length)
  if (selectedMentor && !selectedMentorData && mentors.length > 0) {
    console.log('❌ Mentor not found in mentors array!', {
      lookingFor: selectedMentor.id,
      available: mentors.map(m => m.mentor.id)
    })
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 dark:text-yellow-400" />
        <div className="dotted-bg-subtle rounded-lg p-4 -m-4 sm:-m-6 lg:-m-8 mb-6 flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Book a 1-on-1 Session</h1>
            {availableCredits > 0 && (
              <div className="flex items-center gap-2 bg-green-600/20 border border-green-500/40 rounded-lg px-4 py-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                <span className="text-sm sm:text-base font-semibold text-green-400">
                  Credits: {availableCredits}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 text-center">
          <p className="text-gray-500 dark:text-gray-400">Loading mentors and availability...</p>
        </div>
      ) : mentors.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No mentors have set their availability yet. Check back later!
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-base sm:text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Select a Mentor
            </h2>
            <div className="flex flex-wrap gap-2">
              {mentors.map(({ mentor, slots }) => (
                <button
                  key={mentor.id}
                  onClick={async () => {
                    console.log('Mentor clicked:', mentor.full_name || mentor.email)
                    setSelectedMentor(mentor)
                    // Load slots for this mentor
                    await loadMentorSlots(mentor.id)
                    console.log('Slots loaded for mentor:', mentor.id)
                  }}
                  className={`px-3 sm:px-4 py-2 text-sm sm:text-base rounded-md transition touch-manipulation ${
                    selectedMentor?.id === mentor.id
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {mentor.full_name || mentor.email}
                  {slots.length > 0 && (
                    <span className="ml-2 text-xs opacity-75">({slots.length})</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {selectedMentor && selectedMentorData ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedMentor.full_name || selectedMentor.email}&apos;s Availability
                  {selectedMentorData.expandedSlots && selectedMentorData.expandedSlots.length > 0 && (
                    <span className="ml-2 text-xs sm:text-sm font-normal text-gray-500 dark:text-gray-400 block sm:inline">
                      ({selectedMentorData.expandedSlots.length} available slots)
                    </span>
                  )}
                </h2>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
                    className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition touch-manipulation"
                  >
                    ← Prev
                  </button>
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mx-1 flex-1 text-center">
                    {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d')}
                  </span>
                  <button
                    onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
                    className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition touch-manipulation"
                  >
                    Next →
                  </button>
                </div>
              </div>

              {/* Desktop: Grid layout */}
              <div className="hidden md:grid md:grid-cols-7 gap-2">
                {weekDays.map((day) => {
                  const daySlots = getSlotsForDay(day, selectedMentorData?.expandedSlots || [])
                  return (
                    <div
                      key={day.toISOString()}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 min-h-[150px]"
                    >
                      <div className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
                        {format(day, 'EEE')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        {format(day, 'MMM d')}
                      </div>
                      <div className="space-y-1">
                        {daySlots.map((slot, idx) => (
                          <button
                            key={`${slot.originalSlotId}-${slot.start_time}-${idx}`}
                            onClick={() => handleBookSlot(slot)}
                            className="w-full bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded p-1 text-xs hover:bg-green-200 dark:hover:bg-green-900/50 transition text-left"
                          >
                            <div className="font-medium text-green-800 dark:text-green-300">
                              {formatTime(slot.start_time)}
                            </div>
                            <div className="text-green-600 dark:text-green-400 text-xs">
                              Available
                            </div>
                            {slot.isRecurring && (
                              <div className="text-green-600 dark:text-green-400 text-xs opacity-75">
                                {slot.recurringPattern}
                              </div>
                            )}
                          </button>
                        ))}
                        {daySlots.length === 0 && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
                            No slots
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Mobile: Horizontal scrollable */}
              <div className="md:hidden overflow-x-auto pb-4 -mx-4 px-4" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin' }}>
                <div className="flex gap-3 min-w-max">
                  {weekDays.map((day) => {
                    const daySlots = getSlotsForDay(day, selectedMentorData?.expandedSlots || [])
                    return (
                      <div
                        key={day.toISOString()}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 min-w-[160px] w-[160px] flex-shrink-0"
                      >
                        <div className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
                          {format(day, 'EEE')}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          {format(day, 'MMM d')}
                        </div>
                        <div className="space-y-1.5">
                          {daySlots.map((slot, idx) => (
                            <button
                              key={`${slot.originalSlotId}-${slot.start_time}-${idx}`}
                              onClick={() => handleBookSlot(slot)}
                              className="w-full bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded p-2 text-xs hover:bg-green-200 dark:hover:bg-green-900/50 transition text-left touch-manipulation"
                            >
                              <div className="font-medium text-green-800 dark:text-green-300">
                                {formatTime(slot.start_time)}
                              </div>
                              <div className="text-green-600 dark:text-green-400 text-xs">
                                Available
                              </div>
                              {slot.isRecurring && (
                                <div className="text-green-600 dark:text-green-400 text-xs opacity-75 mt-0.5">
                                  {slot.recurringPattern}
                                </div>
                              )}
                            </button>
                          ))}
                          {daySlots.length === 0 && (
                            <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
                              No slots
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : selectedMentor ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                {selectedMentorData ? 'Loading availability...' : `No availability data found for ${selectedMentor.full_name || selectedMentor.email}. Click a time slot to book.`}
              </p>
            </div>
          ) : null}
        </>
      )}

      {showPaymentModal && selectedSlot && selectedMentor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-4 sm:p-6 my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Confirm Booking
            </h3>
            <div className="space-y-4 mb-6">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Mentor</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedMentor?.full_name || selectedMentor?.email}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Date & Time</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {format(parseISO(selectedSlot.start_time), 'PPp')} - {formatTime(selectedSlot.end_time)}
                </p>
              </div>
              {availableCredits > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-2 border-green-400 dark:border-green-600 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-green-500 rounded-full p-2">
                      <DollarSign className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-green-800 dark:text-green-300">
                        Use Your Credit!
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-400">
                        You have {availableCredits} credit{availableCredits > 1 ? 's' : ''} available
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-green-800 dark:text-green-300 font-medium">
                    ✓ This booking will use 1 credit - no payment required
                  </p>
                </div>
              )}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">Payment Method</p>
                </div>
                {availableCredits > 0 ? (
                  <div className="space-y-3">
                    <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-600 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            id="use-credit"
                            name="payment-method"
                            defaultChecked
                            className="w-4 h-4 text-green-600"
                          />
                          <label htmlFor="use-credit" className="font-medium text-green-800 dark:text-green-300">
                            Use Credit (FREE)
                          </label>
                        </div>
                        <p className="text-xl font-bold text-green-600 dark:text-green-400">$0.00</p>
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg p-3 opacity-60">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            id="pay-now"
                            name="payment-method"
                            disabled
                            className="w-4 h-4 text-gray-400"
                          />
                          <label htmlFor="pay-now" className="font-medium text-gray-500 dark:text-gray-400">
                            Pay Now
                          </label>
                        </div>
                        <p className="text-xl font-bold text-gray-500 dark:text-gray-400">$150.00</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 dark:text-white">Pay with Card</p>
                      <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">$150.00</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPaymentModal(false)
                  setSelectedSlot(null)
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBooking}
                disabled={booking}
                className={`flex-1 px-4 py-2 rounded-md text-white disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 ${
                  availableCredits > 0
                    ? 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/50'
                    : 'bg-yellow-500 hover:bg-yellow-600'
                }`}
              >
                {booking ? (
                  'Processing...'
                ) : availableCredits > 0 ? (
                  <>
                    <DollarSign className="w-5 h-5" />
                    Book with Credit (FREE)
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Pay $150 & Book
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
