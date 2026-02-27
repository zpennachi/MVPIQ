# Complete List of Email Notifications

All emails are sent from **mvpiqweb@gmail.com** via Gmail API.

---

## 📧 Feedback Submission Emails

### 1. Payment Confirmation
- **Type**: `payment_confirmation`
- **Sent to**: Player/User
- **When**: After payment is successfully processed for a feedback submission
- **Subject**: "Payment Confirmation - Football Feedback"
- **Content**: 
  - Payment amount
  - Submission ID
  - Video title
  - Confirmation that feedback request is submitted
- **Triggered from**: 
  - `app/api/submissions/payment/route.ts`
  - `app/api/webhooks/stripe/route.ts` (webhook)

---

### 2. Submission Success
- **Type**: `submission_success`
- **Sent to**: Player/User
- **When**: After video is successfully submitted and payment confirmed
- **Subject**: "Video Submission Successful - MVP-IQ"
- **Content**:
  - Video title
  - Link to view submissions dashboard
  - Message that submission is being reviewed
- **Triggered from**:
  - `app/api/submissions/payment/route.ts`
  - `app/api/webhooks/stripe/route.ts` (webhook)
  - `app/api/videos/payment/route.ts`

---

### 3. New Submission Notification
- **Type**: `new_submission`
- **Sent to**: Mentor
- **When**: When a new feedback submission is assigned to a mentor
- **Subject**: "New Feedback Submission - MVP-IQ"
- **Content**:
  - Video title
  - Player name
  - Link to review submission in dashboard
- **Triggered from**:
  - `components/video/VideoList.tsx` (when submission created)
  - `app/api/submissions/payment/route.ts`
  - `app/api/webhooks/stripe/route.ts` (webhook)

---

### 4. Pro Feedback Draft
- **Type**: `pro_feedback_draft`
- **Sent to**: Mentor/Pro
- **When**: When a submission is assigned to a pro for feedback (MVP-IQ workflow)
- **Subject**: "Feedback Request: [Video Title]"
- **Content**:
  - Player name
  - Video title
  - Player numbers
  - Player notes
  - Video URL
  - Instructions for providing feedback via email reply
- **Triggered from**: `app/api/feedback/email-draft/route.ts`

---

### 5. Feedback Ready
- **Type**: `feedback_ready`
- **Sent to**: Player/User
- **When**: When mentor marks feedback as completed
- **Subject**: "Your Feedback is Ready! - Football Feedback"
- **Content**:
  - Video title
  - Rating (if provided)
  - Link to view feedback in dashboard
- **Triggered from**: `components/feedback/FeedbackForm.tsx` (when feedback submitted)

---

## 📅 Session/Appointment Emails

### 6. Session Confirmation
- **Type**: `session_confirmation`
- **Sent to**: User/Player
- **When**: After session is booked and payment is confirmed
- **Subject**: "Session Booking Confirmed - MVP-IQ"
- **Content**:
  - Mentor name
  - Scheduled time
  - Google Meet link (if generated)
  - Link to view session in dashboard
- **Triggered from**:
  - `app/api/sessions/payment/route.ts`
  - `app/api/webhooks/stripe/route.ts` (webhook)

---

### 7. Session Booking Notification
- **Type**: `session_booking_notification`
- **Sent to**: Mentor
- **When**: After session is booked and payment is confirmed
- **Subject**: "New Session Booking - MVP-IQ"
- **Content**:
  - Client/User name
  - Scheduled time
  - Google Meet link (if generated)
  - Link to view booking in dashboard
- **Triggered from**:
  - `app/api/sessions/payment/route.ts`
  - `app/api/webhooks/stripe/route.ts` (webhook)

---

### 8. Session Reminder
- **Type**: `session_reminder`
- **Sent to**: Both User and Mentor
- **When**: Daily cron job for sessions scheduled today
- **Subject**: "Reminder: Your Session is Today - MVP-IQ"
- **Content**:
  - Mentor name (for user) / User name (for mentor)
  - Scheduled time
  - Google Meet link
  - Link to view appointments
- **Triggered from**: `app/api/sessions/reminders/route.ts` (cron endpoint)
- **Note**: This should be called daily via cron job

---

### 9. Session Cancelled
- **Type**: `session_cancelled`
- **Sent to**: User/Player
- **When**: When a session is cancelled
- **Subject**: "Session Cancelled - MVP-IQ"
- **Content**:
  - Mentor name
  - Scheduled time
  - Notification that session credit has been added
  - Reschedule link (free with credit)
  - Contact support link
- **Triggered from**:
  - `components/calendar/MyAppointments.tsx` (user cancels)
  - `components/dashboard/MentorDashboard.tsx` (mentor cancels)

---

## 🔐 Admin/System Emails

### 10. Password Reset (Recovery)
- **Type**: `recovery`
- **Sent to**: User
- **When**: Admin resets user password or user requests password reset
- **Subject**: (Handled by Supabase Auth)
- **Content**: Password reset link
- **Triggered from**:
  - `app/api/admin/reset-password/route.ts`
  - `app/api/admin/invite-user/route.ts` (when inviting users)

---

## Summary

**Total Email Types**: 10

**By Category**:
- Feedback Submissions: 5 emails
- Sessions/Appointments: 4 emails
- Admin/System: 1 email

**All emails sent from**: `mvpiqweb@gmail.com`

**All emails use**: Gmail API with OAuth authentication

---

## Testing

Test endpoint: `http://localhost:3000/api/test-email?to=your-email@example.com`

This sends a test email to verify the system is working.
