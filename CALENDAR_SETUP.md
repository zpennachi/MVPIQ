# Custom Calendar System Setup

This document describes the custom calendar system for booking 1-on-1 sessions with mentors.

## Features

- **Mentor Availability Management**: Mentors can set their available time slots
- **Session Booking**: Players and coaches can view mentor availability and book sessions
- **Payment Integration**: $150 payment is required when booking a session
- **Email Notifications**: Confirmation emails sent to both user and mentor

## Database Setup

1. **Run the calendar schema migration:**
   ```sql
   -- Copy and paste the contents of supabase/calendar-schema.sql into your Supabase SQL Editor
   ```

   This creates:
   - `availability_slots` table: Mentors' available time slots
   - `booked_sessions` table: Booked 1-on-1 sessions
   - RLS policies for security
   - Helper function to check slot availability

## User Flow

### For Mentors (Pros)

1. Navigate to **Calendar** in the sidebar
2. See "My Availability" interface
3. Click **Add Availability** to set time slots
4. Can set:
   - Date and time range
   - Recurring slots (daily, weekly, monthly)
   - Multiple slots per day

### For Players/Coaches

1. Navigate to **Calendar** in the sidebar
2. See "Book a 1-on-1 Session" interface
3. Select a mentor from available options
4. View mentor's availability in weekly calendar view
5. Click on an available time slot
6. Payment modal appears ($150)
7. Complete payment via Stripe
8. Session is confirmed

## Payment Flow

1. User selects a time slot
2. Payment modal shows session details and $150 total
3. User confirms booking
4. Stripe Checkout is initiated (or skipped in dev mode)
5. On successful payment:
   - Session status updated to "confirmed"
   - Confirmation emails sent to both parties
6. Meeting details can be added later by mentor

## Email Notifications

### Session Confirmation (to user)
- Sent when session is booked and payment is successful
- Includes mentor name and scheduled time
- Link to view session details

### Session Booking Notification (to mentor)
- Sent when someone books their session
- Includes client name and scheduled time
- Link to view booking details

## API Endpoints

### POST `/api/sessions/payment`
Processes payment for a booked session.

**Request:**
```json
{
  "sessionId": "uuid",
  "amount": 15000  // $150 in cents
}
```

**Response:**
```json
{
  "checkoutUrl": "https://checkout.stripe.com/...",  // Stripe checkout URL
  "paymentIntentId": "pi_...",
  "devMode": false  // true if in dev mode (payment skipped)
}
```

## Environment Variables

Make sure you have:
```env
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_APP_URL=http://localhost:3000  # or your production URL
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=your-email@domain.com
```

## Development Mode

If `STRIPE_SECRET_KEY` is not set or in development mode:
- Payment is automatically skipped
- Session is marked as "confirmed" with a dev payment intent ID
- Emails are still sent

## Future Enhancements

- Meeting link generation (Zoom, Google Meet)
- Session cancellation and refunds
- Recurring session management
- Session reminders
- Video call integration
- Session notes/history
- Rating system after sessions
