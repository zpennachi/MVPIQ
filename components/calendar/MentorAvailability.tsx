'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AvailabilitySlot, Profile } from '@/types/database'
import { Calendar, Clock, Plus, Trash2, Edit } from 'lucide-react'
import { format, startOfWeek, addDays, eachDayOfInterval, addWeeks, subWeeks, isSameDay, parseISO } from 'date-fns'
import { expandRecurringSlots } from '@/lib/calendar/recurring-slots'
import type { ExpandedSlot } from '@/lib/calendar/recurring-slots'

interface MentorAvailabilityProps {
  mentorId: string
}

export function MentorAvailability({ mentorId }: MentorAvailabilityProps) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [expandedSlots, setExpandedSlots] = useState<ExpandedSlot[]>([])
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [formData, setFormData] = useState({
    date: '',
    startTime: '09:00',
    endTime: '09:15',
    isRecurring: false,
    recurringPattern: 'weekly' as 'daily' | 'weekly' | 'monthly',
    recurringEndDate: '',
  })
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: addDays(weekStart, 6),
  })

  useEffect(() => {
    loadSlots()
  }, [currentWeek, mentorId])

  const loadSlots = async () => {
    const weekEnd = addDays(weekStart, 7)

    // Get all slots (including recurring ones that might start before this week)
    const { data } = await supabase
      .from('availability_slots')
      .select('*')
      .eq('mentor_id', mentorId)
      .eq('is_active', true)
      .order('start_time', { ascending: true })

    if (data) {
      setSlots(data as AvailabilitySlot[])
      // Expand recurring slots for this week
      const expanded = expandRecurringSlots(data as AvailabilitySlot[], weekStart, weekEnd)
      setExpandedSlots(expanded)
    }
  }

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const dateTime = new Date(`${formData.date}T${formData.startTime}`)
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`)

      if (endDateTime <= dateTime) {
        alert('End time must be after start time')
        setLoading(false)
        return
      }

      const { error } = await supabase
        .from('availability_slots')
        .insert({
          mentor_id: mentorId,
          start_time: dateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          duration_minutes: Math.round((endDateTime.getTime() - dateTime.getTime()) / 60000),
          is_recurring: formData.isRecurring,
          recurring_pattern: formData.isRecurring ? formData.recurringPattern : null,
          recurring_end_date: formData.isRecurring && formData.recurringEndDate ? new Date(formData.recurringEndDate).toISOString() : null,
        })

      if (error) throw error

      setShowAddModal(false)
      setFormData({
        date: '',
        startTime: '09:00',
        endTime: '10:00',
        isRecurring: false,
        recurringPattern: 'weekly',
        recurringEndDate: '',
      })
      loadSlots()
    } catch (error: any) {
      alert('Failed to add availability: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSlot = async (slotId: string) => {
    const slot = slots.find(s => s.id === slotId)
    const message = slot?.is_recurring
      ? `Are you sure you want to delete this recurring availability? This will remove ALL instances (${slot.recurring_pattern}).`
      : 'Are you sure you want to delete this availability slot?'

    if (!confirm(message)) return

    // Delete by original slot ID (this will remove all recurring instances since they share the same ID)
    const { error } = await supabase
      .from('availability_slots')
      .update({ is_active: false })
      .eq('id', slotId)

    if (error) {
      alert('Failed to delete slot: ' + error.message)
    } else {
      loadSlots()
    }
  }

  const getSlotsForDay = (day: Date) => {
    return expandedSlots.filter(slot => {
      const slotDate = parseISO(slot.start_time)
      return isSameDay(slotDate, day)
    })
  }

  const formatTime = (dateString: string) => {
    return format(parseISO(dateString), 'h:mm a')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 dark:text-yellow-400" />
          <div className="dotted-bg-subtle rounded-lg p-4 -m-4 sm:-m-6 lg:-m-8 mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">My Availability</h1>
          </div>
        </div>
        <button
          onClick={() => {
            const today = format(new Date(), 'yyyy-MM-dd')
            setFormData({ ...formData, date: today })
            setShowAddModal(true)
          }}
          className="flex items-center gap-2 bg-yellow-500 text-white px-4 py-2.5 rounded-md hover:bg-yellow-600 transition-all duration-300 active:scale-95 hover:shadow-lg w-full sm:w-auto justify-center touch-manipulation font-medium"
        >
          <Plus className="w-5 h-5" />
          Add Availability
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
              className="px-3 sm:px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300 active:scale-95 touch-manipulation"
            >
              ← Prev
            </button>
            <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white text-center flex-1 sm:flex-none">
              {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d')}
            </h2>
            <button
              onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
              className="px-3 sm:px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300 active:scale-95 touch-manipulation"
            >
              Next →
            </button>
          </div>
        </div>

        {/* Desktop: Grid layout */}
        <div className="hidden md:grid md:grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const daySlots = getSlotsForDay(day)
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
                    <div
                      key={`${slot.originalSlotId}-${slot.start_time}-${idx}`}
                      className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded p-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-yellow-800 dark:text-yellow-300">
                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                          </div>
                          {slot.isRecurring && (
                            <div className="text-yellow-600 dark:text-yellow-400 text-xs">
                              {slot.recurringPattern} (recurring)
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteSlot(slot.originalSlotId)}
                          className="text-red-500 hover:text-red-700"
                          title="Delete this recurring slot (removes all instances)"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Mobile: Vertical stack and scrollable */}
        <div className="md:hidden space-y-3 max-h-[600px] overflow-y-auto">
          {weekDays.map((day) => {
            const daySlots = getSlotsForDay(day)
            return (
              <div
                key={day.toISOString()}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
              >
                <div className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
                  {format(day, 'EEE')}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  {format(day, 'MMM d')}
                </div>
                <div className="space-y-1.5">
                  {daySlots.map((slot, idx) => (
                    <div
                      key={`${slot.originalSlotId}-${slot.start_time}-${idx}`}
                      className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded p-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-yellow-800 dark:text-yellow-300">
                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                          </div>
                          {slot.isRecurring && (
                            <div className="text-yellow-600 dark:text-yellow-400 text-xs mt-0.5">
                              {slot.recurringPattern} (recurring)
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteSlot(slot.originalSlotId)}
                          className="text-red-500 hover:text-red-700 ml-2"
                          title="Delete this recurring slot (removes all instances)"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
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

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-4 sm:p-6 my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Add Availability
            </h3>
            <form onSubmit={handleAddSlot} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="recurring" className="text-sm text-gray-700 dark:text-gray-300">
                  Make this recurring
                </label>
              </div>
              {formData.isRecurring && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Recurring Pattern
                    </label>
                    <select
                      value={formData.recurringPattern}
                      onChange={(e) => setFormData({ ...formData, recurringPattern: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      End Date (Optional) - Leave blank for no end date
                    </label>
                    <input
                      type="date"
                      value={formData.recurringEndDate}
                      onChange={(e) => setFormData({ ...formData, recurringEndDate: e.target.value })}
                      min={formData.date}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                </>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 active:scale-95 hover:shadow-lg"
                >
                  {loading ? 'Adding...' : 'Add Availability'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
