# Email Notifications Summary

All emails are sent from **mvpiqweb@gmail.com** using Gmail API with OAuth authentication.

## Email Types & Triggers

### 1. Feedback Submission Emails

#### Payment Confirmation (to Player)
- **Trigger**: When payment is completed for a feedback submission
- **Type**: `payment_confirmation`
- **Sent to**: Player email
- **Location**: `app/api/submissions/payment/route.ts`

#### Submission Success (to Player)
- **Trigger**: After successful video submission and payment
- **Type**: `submission_success`
- **Sent to**: Player email
- **Location**: `app/api/submissions/payment/route.ts`

#### New Submission Notification (to Mentor)
- **Trigger**: When a new feedback submission is assigned to a mentor
- **Type**: `new_submission`
- **Sent to**: Mentor email
- **Location**: `components/video/VideoList.tsx` (when submission is created)

#### Pro Feedback Draft (to Mentor/Pro)
- **Trigger**: When a submission is assigned to a pro for feedback
- **Type**: `pro_feedback_draft`
- **Sent to**: Mentor/Pro email
- **Location**: `app/api/feedback/email-draft/route.ts`

#### Feedback Ready (to Player)
- **Trigger**: When mentor marks feedback as completed
- **Type**: `feedback_ready`
- **Sent to**: Player email
- **Location**: `components/feedback/FeedbackForm.tsx` (when feedback is submitted)

### 2. Appointment/Session Emails

#### Session Confirmation (to User/Player)
- **Trigger**: When a session is booked and payment is confirmed
- **Type**: `session_confirmation`
- **Sent to**: User/Player email
- **Includes**: Mentor name, scheduled time, Google Meet link
- **Location**: `app/api/sessions/payment/route.ts` and `app/api/webhooks/stripe/route.ts`

#### Session Booking Notification (to Mentor)
- **Trigger**: When a session is booked and payment is confirmed
- **Type**: `session_booking_notification`
- **Sent to**: Mentor email
- **Includes**: Client name, scheduled time, Google Meet link
- **Location**: `app/api/sessions/payment/route.ts` and `app/api/webhooks/stripe/route.ts`

#### Session Reminder (to Both)
- **Trigger**: Daily cron job for sessions scheduled today
- **Type**: `session_reminder`
- **Sent to**: Both user and mentor
- **Location**: `app/api/sessions/reminders/route.ts` (cron endpoint)

#### Session Cancelled (to User)
- **Trigger**: When a session is cancelled
- **Type**: `session_cancelled`
- **Sent to**: User email
- **Includes**: Reschedule link and credit information
- **Location**: `app/api/calendar/cancel/route.ts` (if implemented)

## Setup Requirements

### 1. Admin OAuth Connection
- An admin account must connect their Google account
- Go to `/dashboard/settings` as an admin
- Click "Connect Google Calendar"
- This grants both Calendar and Gmail API access

### 2. Google Cloud Console Setup
- Enable **Gmail API** in Google Cloud Console
- Add `https://www.googleapis.com/auth/gmail.send` scope to OAuth consent screen
- Ensure redirect URI includes: `http://localhost:3000/api/calendar/oauth/callback` (for local) and production URL

### 3. Environment Variables
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/oauth/callback
```

## Testing

### Test Email Endpoint
Visit: `http://localhost:3000/api/test-email?to=your-email@example.com`

This will send a test email from mvpiqweb@gmail.com to verify the setup is working.

## Email Flow

1. **All emails** → `/api/notifications/email` → `sendGmailEmail()` → Gmail API
2. **From address**: Always `mvpiqweb@gmail.com` (hardcoded)
3. **OAuth tokens**: Uses admin's Google OAuth tokens (shared with Calendar)
4. **Token refresh**: Automatically refreshes expired tokens

## Current Status

✅ All email types are implemented
✅ All triggers are in place
✅ Gmail API integration is complete
✅ Email address updated to mvpiqweb@gmail.com
✅ OAuth token refresh is working

## Next Steps

1. **Connect admin Google account**:
   - Log in as admin
   - Go to `/dashboard/settings`
   - Click "Connect Google Calendar"
   - Complete OAuth flow

2. **Test email sending**:
   - Visit `/api/test-email?to=your-email@example.com`
   - Check inbox for test email

3. **Verify in production**:
   - Make sure admin has connected Google account in production
   - Test a real booking or submission to verify emails are sent
