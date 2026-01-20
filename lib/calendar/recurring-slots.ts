import { parseISO, addDays, addWeeks, addMonths, startOfDay, isBefore, isAfter, differenceInDays, differenceInWeeks, differenceInMonths } from 'date-fns'
import type { AvailabilitySlot } from '@/types/database'

export interface ExpandedSlot {
  originalSlotId: string
  start_time: string
  end_time: string
  duration_minutes: number
  isRecurring: boolean
  recurringPattern: string | null
}

/**
 * Expands recurring slots into individual instances for a given date range
 */
export function expandRecurringSlots(
  slots: AvailabilitySlot[],
  startDate: Date,
  endDate: Date
): ExpandedSlot[] {
  const expanded: ExpandedSlot[] = []
  
  console.log('[expandRecurringSlots] Expanding', slots.length, 'slots from', startDate.toISOString(), 'to', endDate.toISOString())

  for (const slot of slots) {
    console.log('[expandRecurringSlots] Processing slot:', {
      id: slot.id,
      is_recurring: slot.is_recurring,
      recurring_pattern: slot.recurring_pattern,
      start_time: slot.start_time
    })
    
    if (!slot.is_recurring) {
      // Non-recurring slot: just add it if it's in the range
      const slotStart = parseISO(slot.start_time)
      if (slotStart >= startDate && slotStart < endDate) {
        expanded.push({
          originalSlotId: slot.id,
          start_time: slot.start_time,
          end_time: slot.end_time,
          duration_minutes: slot.duration_minutes,
          isRecurring: false,
          recurringPattern: null,
        })
      }
    } else {
      // Recurring slot: generate instances
      const baseStart = parseISO(slot.start_time)
      const baseEnd = parseISO(slot.end_time)
      const duration = slot.duration_minutes

      // Check if slot has ended
      if (slot.recurring_end_date) {
        const endDateLimit = parseISO(slot.recurring_end_date)
        if (endDate > endDateLimit) {
          // Adjust end date to recurring_end_date if it's earlier
          endDate = endDateLimit > startDate ? endDateLimit : startDate
        }
      }

      // Generate instances based on pattern
      if (slot.recurring_pattern === 'daily') {
        console.log('[expandRecurringSlots] Processing daily recurring slot')
        // Daily: show every day
        const startDateDay = startOfDay(startDate)
        const endDateDay = startOfDay(endDate)
        let currentDate = new Date(startDateDay) // Always start from the beginning of our date range
        
        console.log('[expandRecurringSlots] Daily - baseStart:', baseStart.toISOString(), 'startDate:', startDateDay.toISOString(), 'endDate:', endDateDay.toISOString())

        // Generate instances for each day until we reach the end date
        let dayCount = 0
        while (currentDate < endDateDay && dayCount < 100) { // Safety limit
          dayCount++
          
          // Check if within recurring end date
          if (slot.recurring_end_date) {
            const endLimit = startOfDay(parseISO(slot.recurring_end_date))
            if (currentDate > endLimit) {
              console.log('[expandRecurringSlots] Reached recurring end date:', endLimit.toISOString())
              break
            }
          }

          // Create slot instance for this day with the original time
          const slotStart = new Date(currentDate)
          slotStart.setHours(baseStart.getHours(), baseStart.getMinutes(), baseStart.getSeconds(), baseStart.getMilliseconds())
          
          const slotEnd = new Date(currentDate)
          slotEnd.setHours(baseEnd.getHours(), baseEnd.getMinutes(), baseEnd.getSeconds(), baseEnd.getMilliseconds())

          // Only add if this instance falls within our date range
          if (slotStart >= startDate && slotStart < endDate) {
            console.log('[expandRecurringSlots] Adding daily instance for:', slotStart.toISOString())
            expanded.push({
              originalSlotId: slot.id,
              start_time: slotStart.toISOString(),
              end_time: slotEnd.toISOString(),
              duration_minutes: duration,
              isRecurring: true,
              recurringPattern: 'daily',
            })
          }

          // Move to next day
          currentDate = addDays(currentDate, 1)
        }
        console.log('[expandRecurringSlots] Generated', expanded.length, 'daily instances')
      } else if (slot.recurring_pattern === 'weekly') {
        // Weekly: show on the same day of week every week
        const dayOfWeek = baseStart.getDay()
        let currentDate = baseStart

        // Start from the start of the range if base is before it
        if (baseStart < startDate) {
          const weeksDiff = differenceInWeeks(startDate, baseStart)
          currentDate = addWeeks(baseStart, weeksDiff)
          // Adjust to the correct day of week
          while (currentDate < startDate || currentDate.getDay() !== dayOfWeek) {
            if (currentDate.getDay() < dayOfWeek) {
              currentDate = addDays(currentDate, dayOfWeek - currentDate.getDay())
            } else if (currentDate.getDay() > dayOfWeek) {
              currentDate = addDays(currentDate, 7 - (currentDate.getDay() - dayOfWeek))
            }
            if (currentDate < startDate) {
              currentDate = addWeeks(currentDate, 1)
            }
          }
        }

        while (currentDate < endDate && currentDate >= startDate) {
          // Check if within recurring end date
          if (slot.recurring_end_date) {
            const endLimit = parseISO(slot.recurring_end_date)
            if (currentDate > endLimit) break
          }

          const slotStart = new Date(currentDate)
          slotStart.setHours(baseStart.getHours(), baseStart.getMinutes(), 0, 0)
          const slotEnd = new Date(slotStart)
          slotEnd.setHours(baseEnd.getHours(), baseEnd.getMinutes(), 0, 0)

          if (slotStart >= startDate && slotStart < endDate) {
            expanded.push({
              originalSlotId: slot.id,
              start_time: slotStart.toISOString(),
              end_time: slotEnd.toISOString(),
              duration_minutes: duration,
              isRecurring: true,
              recurringPattern: 'weekly',
            })
          }

          currentDate = addWeeks(currentDate, 1)
        }
      } else if (slot.recurring_pattern === 'monthly') {
        // Monthly: show on the same day of month every month
        const dayOfMonth = baseStart.getDate()
        let currentDate = baseStart

        // Start from the start of the range if base is before it
        if (baseStart < startDate) {
          const monthsDiff = differenceInMonths(startDate, baseStart)
          currentDate = addMonths(baseStart, monthsDiff)
          // Adjust to the correct day
          currentDate.setDate(dayOfMonth)
          if (currentDate < startDate) {
            currentDate = addMonths(currentDate, 1)
          }
        }

        while (currentDate < endDate && currentDate >= startDate) {
          // Check if within recurring end date
          if (slot.recurring_end_date) {
            const endLimit = parseISO(slot.recurring_end_date)
            if (currentDate > endLimit) break
          }

          const slotStart = new Date(currentDate)
          slotStart.setHours(baseStart.getHours(), baseStart.getMinutes(), 0, 0)
          const slotEnd = new Date(slotStart)
          slotEnd.setHours(baseEnd.getHours(), baseEnd.getMinutes(), 0, 0)

          if (slotStart >= startDate && slotStart < endDate) {
            expanded.push({
              originalSlotId: slot.id,
              start_time: slotStart.toISOString(),
              end_time: slotEnd.toISOString(),
              duration_minutes: duration,
              isRecurring: true,
              recurringPattern: 'monthly',
            })
          }

          currentDate = addMonths(currentDate, 1)
          // Handle months with different number of days
          if (currentDate.getDate() !== dayOfMonth) {
            currentDate.setDate(0) // Last day of previous month
            currentDate.setDate(dayOfMonth)
          }
        }
      }
    }
  }

  return expanded.sort((a, b) => 
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  )
}
