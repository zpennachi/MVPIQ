# Calendar Recurring Slots & Appointments Setup

This document describes the recurring slots functionality and appointment management features.

## Features Implemented

### 1. Recurring Availability Slots
- **Weekly Recurrence**: Slots appear on the same day every week
- **Daily Recurrence**: Slots appear every day
- **Monthly Recurrence**: Slots appear on the same day every month
- **End Date Support**: Optional end date for recurring slots

### 2. Delete Recurring Slots
- When you delete a recurring slot, it removes ALL instances (weekly/daily/monthly)
- Deletion is handled by setting `is_active = false` on the original slot
- All recurring instances share the same `id`, so deleting one removes all

### 3. User Appointments View
- New **"My Appointments"** section in sidebar (for players/coaches, not mentors)
- Weekly calendar view showing upcoming sessions
- List view of all upcoming appointments
- Meeting link support (Zoom, Google Meet, etc.)

### 4. Email Notifications
- **Payment Confirmation**: Sent when session is booked and payment is successful
- **Booking Notification**: Sent to mentor when someone books their session
- **Day-of Reminder**: Sent to both user and mentor on the day of the session

## Recurring Slot Logic

The `expandRecurringSlots()` function in `lib/calendar/recurring-slots.ts`:
- Takes original slots and expands recurring ones into individual instances
- Filters instances by date range (current week)
- Generates proper start/end times for each instance
- Maintains link to original slot via `originalSlotId`

### How It Works

1. **Non-recurring slots**: Displayed as-is
2. **Daily recurring**: Generates one instance per day in the date range
3. **Weekly recurring**: Generates one instance per week (same day of week)
4. **Monthly recurring**: Generates one instance per month (same day of month)

## Booking Flow

1. User selects a mentor
2. Calendar shows expanded recurring slots
3. User clicks on an available slot
4. Payment modal appears ($150)
5. Booking is created with:
   - `availability_slot_id`: The original slot ID (for recurring slots)
   - `start_time`: The specific instance time
   - `end_time`: The specific instance end time

## Day-of Reminder Cron Job

### Setup

1. **Set up cron job** (e.g., Vercel Cron, GitHub Actions, or external service):
   ```bash
   # Run daily at 8 AM
   0 8 * * * curl -X POST https://your-domain.com/api/sessions/reminders \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

2. **Environment Variable**:
   ```env
   CRON_SECRET=your-secure-random-secret-key
   ```

3. **Manual Testing**:
   ```bash
   curl -X POST http://localhost:3000/api/sessions/reminders \
     -H "Authorization: Bearer your-secure-random-secret-key"
   ```

### What It Does

- Checks for sessions scheduled today
- Sends reminder emails to both user and mentor
- Includes meeting link if available
- Returns summary of reminders sent

## API Endpoints

### POST `/api/sessions/reminders`
Sends day-of reminders for sessions scheduled today.

**Headers:**
```
Authorization: Bearer YOUR_CRON_SECRET
```

**Response:**
```json
{
  "success": true,
  "message": "Sent 4 reminders for 2 sessions",
  "remindersSent": [...],
  "sessionsProcessed": 2
}
```

## Navigation Updates

- **Mentors**: See "My Availability" in Calendar menu
- **Players/Coaches**: See "Book Session" in Calendar menu
- **Players/Coaches**: See "My Appointments" in sidebar (new!)
- **All**: See "Education" in sidebar

## Testing Recurring Slots

1. **As Mentor**:
   - Go to Calendar → My Availability
   - Click "Add Availability"
   - Set a date, time, and check "Make this recurring"
   - Select pattern (daily/weekly/monthly)
   - Optionally set an end date
   - Save

2. **As Player/Coach**:
   - Go to Calendar → Book Session
   - Select the mentor
   - You should see the recurring slots appear across multiple days/weeks
   - Click on any available slot to book

3. **Delete Recurring Slot**:
   - As mentor, go to Calendar
   - Find a recurring slot
   - Click the trash icon
   - Confirm deletion
   - All instances should disappear

## Email Notification Types

### `session_confirmation`
Sent to user when booking is confirmed.

### `session_booking_notification`
Sent to mentor when someone books their session.

### `session_reminder`
Sent to both user and mentor on the day of the session.

## Future Enhancements

- Edit recurring slots (change time, pattern, etc.)
- Cancel individual recurring instances
- Multiple recurring patterns per slot
- Time zone support
- Calendar sync (Google Calendar, iCal, etc.)
- SMS reminders
- Automatic meeting link generation
