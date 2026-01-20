# MVP-IQ User Flows Documentation

This document outlines all user flows from start to finish for the MVP-IQ platform. Use this to understand the complete user journey for each role.

---

## Table of Contents

1. [Player Flows](#player-flows)
2. [Coach/School Flows](#coachschool-flows)
3. [Mentor Flows](#mentor-flows)
4. [Admin Flows](#admin-flows)
5. [Shared Flows](#shared-flows)

---

## Player Flows

### 1. Player Registration & Onboarding

**Flow Steps:**
1. User visits homepage (`/`)
2. Clicks "Sign Up" or "Log In" in navigation
3. If new user, clicks "Sign Up" button
4. Fills out registration form:
   - Email address
   - Password
   - Full name
   - Phone number (optional)
   - Profile photo (optional)
   - Selects role: "Player"
5. Submits registration
6. Receives email verification (if enabled)
7. Redirected to dashboard (`/dashboard`)

**Key Features:**
- Profile photo upload during signup (optional)
- Email verification
- Automatic role assignment

---

### 2. Player Dashboard Overview

**Flow Steps:**
1. Player logs in
2. Redirected to `/dashboard`
3. Sees personalized welcome overlay:
   - "Welcome back, [Name]!"
   - Profile photo (or initials)
   - Player number (if on a team)
   - School/Team name (if on a team)
4. Dashboard shows:
   - **Feedback Section** (top priority):
     - Filter buttons: "All", "Complete Feedback", "Under Review"
     - List of feedback submissions with status
   - **Videos Awaiting Feedback** (below feedback)
   - **One-on-One Sessions** (upcoming appointments)
   - **Upload Video/Get Feedback** section (full width at top)

**Key Features:**
- Personalized greeting
- Team membership display (if applicable)
- Filterable feedback list
- Payment status indicators
- "Need help with your order?" link for pending items

---

### 3. Player Video Submission & Payment Flow

**Flow Steps:**
1. Player navigates to dashboard
2. Scrolls to "Upload Video/Get Feedback" section
3. Clicks "Upload New Video"
4. Fills out video submission form:
   - Video title
   - Description
   - Uploads video file (drag & drop or click to browse)
   - Video requirements shown:
     - Keep videos under 60 seconds
     - File size must be under 1GB
5. Clicks "Checkout ($50)" button
6. Video is uploaded to storage (status: `pending`)
7. Redirected to Stripe Checkout page
8. Completes payment ($50)
9. Redirected back to dashboard with success message
10. Video status updates to `ready`
11. Feedback submission is automatically created (status: `pending`)
12. Mentor is assigned and receives email notification

**Key Features:**
- File upload with drag & drop
- Client-side validation (size, duration)
- Payment required before processing
- Automatic feedback submission creation
- Email notification to mentor

---

### 4. Player Viewing Feedback

**Flow Steps:**
1. Player navigates to dashboard
2. Sees feedback section with filter options
3. Clicks on a completed feedback item
4. Views feedback details:
   - Mentor name and profile picture
   - Feedback text
   - Rating (1-5 stars)
   - Completion date
   - Video playback (if feedback video provided)
5. Can filter feedback by:
   - "All" - shows all submissions
   - "Complete Feedback" - shows only completed
   - "Under Review" - shows pending/in-progress

**Key Features:**
- Detailed feedback view
- Mentor information display
- Video playback for feedback videos
- Status tracking

---

### 5. Player Booking One-on-One Session

**Flow Steps:**
1. Player navigates to "Calendar" in sidebar
2. Sees "Book a 1-on-1 Session" interface
3. Selects a mentor from dropdown
4. Views mentor's availability in calendar
5. Clicks on an available time slot
6. Sees session details modal:
   - Mentor name and profile picture
   - Date and time
   - Duration
   - Price: $150
7. Clicks "Book Session"
8. Redirected to Stripe Checkout ($150)
9. Completes payment
10. Receives confirmation email
11. Session appears in "My Appointments" section
12. Can view session details:
   - Date, time, status
   - Mentor name and picture
   - Meeting link (when provided by mentor)
   - "Have a problem? Contact us" link

**Key Features:**
- Mentor selection
- Calendar view of availability
- Payment integration ($150)
- Email confirmations
- Session management

---

### 6. Player Account Settings

**Flow Steps:**
1. Player clicks "Account Settings" in sidebar or profile dropdown
2. Navigates to `/dashboard/settings`
3. Views current profile information:
   - Full name
   - Email
   - Phone number
   - Profile photo
4. Can update:
   - Full name (instant update)
   - Phone number (instant update)
   - Profile photo (upload new image)
   - Email (requires re-authentication)
5. Changes are saved automatically
6. Profile photo updates across all dashboards

**Key Features:**
- Profile management
- Photo upload/update
- Email change with security verification
- Real-time updates

---

### 7. Player Education Access

**Flow Steps:**
1. Player navigates to "Education" in sidebar
2. If player has NOT paid $50:
   - Education tab is greyed out
   - Lock icon displayed
   - Tooltip: "Upgrade to access education content"
3. If player HAS paid $50:
   - Education section loads
   - Can filter by position
   - Views training videos
   - Can play videos

**Key Features:**
- Payment-gated access
- Position-based filtering
- Training video library

---

## Coach/School Flows

### 1. Coach Registration & Team Setup

**Flow Steps:**
1. Coach visits homepage
2. Clicks "Sign Up"
3. Fills out registration form:
   - Email address
   - Password
   - Full name
   - Phone number (optional)
   - Profile photo (optional)
   - Selects role: "Coach"
4. Submits registration
5. Redirected to dashboard
6. Sees "Team Roster" section
7. Creates a new team:
   - Enters team/school name
   - Clicks "Create Team"
8. Team is created and coach is assigned as team owner

**Key Features:**
- Team creation
- Automatic coach assignment
- Team management interface

---

### 2. Coach Inviting Players to Team

**Flow Steps:**
1. Coach navigates to dashboard
2. Sees "Team Roster" section
3. Clicks "Invite Player" button
4. Fills out invitation form:
   - Player email address
   - Player name
   - Player number (optional)
5. Submits invitation
6. Player receives email invitation
7. Player accepts invitation (if new account, creates one)
8. Player appears in team roster
9. Player's dashboard shows team affiliation

**Key Features:**
- Email-based invitations
- Automatic account creation for new players
- Team membership tracking
- Player number assignment

---

### 3. Coach Managing Team Roster

**Flow Steps:**
1. Coach navigates to dashboard
2. Views team roster with all players
3. For each player, can:
   - **Edit Player**:
     - Click "Edit" button
     - Update player name
     - Update player number
     - Cannot change email or password
     - Saves changes
   - **Remove Player**:
     - Click "Remove" button
     - Confirms removal
     - Player is removed from team
     - Player's dashboard no longer shows team affiliation

**Key Features:**
- Edit player information
- Remove players from team
- Real-time roster updates
- Team affiliation management

---

### 4. Coach Submitting Videos for Players

**Flow Steps:**
1. Coach navigates to dashboard
2. Sees "Upload Video" section
3. System checks monthly video limit (15 videos per month)
4. If under limit:
   - Clicks "Upload New Video"
   - Fills out form:
     - Video title
     - Description
     - Selects player from team roster
     - Uploads video file
   - Clicks "Submit"
   - Video is uploaded
   - Feedback submission is created
   - Mentor is assigned and notified
5. If at limit:
   - Upload form shows: "Monthly limit reached (15/15)"
   - Cannot submit additional videos until next month

**Key Features:**
- 15 videos per month limit
- Player selection from roster
- Automatic feedback submission
- Monthly limit tracking

---

### 5. Coach Viewing Team Submissions

**Flow Steps:**
1. Coach navigates to dashboard
2. Views "Team Submissions" section
3. Sees all videos submitted for team players
4. Can filter by:
   - Player
   - Status (pending, in progress, completed)
5. Clicks on submission to view details:
   - Player name and number
   - Video title and description
   - Submission date
   - Feedback status
   - Mentor assignment

**Key Features:**
- Team-wide submission tracking
- Player filtering
- Status monitoring

---

### 6. Coach Booking Sessions for Players

**Flow Steps:**
1. Coach navigates to "Calendar" in sidebar
2. Sees "Book a 1-on-1 Session" interface
3. Selects a mentor
4. Views mentor availability
5. Books session (same flow as player)
6. Session is booked under coach's account
7. Coach can manage session on behalf of team

**Key Features:**
- Same booking flow as players
- Session management
- Team coordination

---

## Mentor Flows

### 1. Mentor Registration & Setup

**Flow Steps:**
1. Mentor visits homepage
2. Clicks "Sign Up"
3. Fills out registration form:
   - Email address
   - Password
   - Full name
   - Phone number (optional)
   - Profile photo (optional)
   - Selects role: "Mentor"
4. Submits registration
5. Redirected to mentor dashboard
6. Sets up availability (optional at first)

**Key Features:**
- Mentor-specific registration
- Profile setup
- Availability management

---

### 2. Mentor Dashboard Overview

**Flow Steps:**
1. Mentor logs in
2. Redirected to `/dashboard`
3. Sees personalized welcome overlay:
   - "Welcome back, [Name]!"
   - Profile photo (or initials)
4. Dashboard shows:
   - **New Submissions** (largest, most visible):
     - List of pending feedback requests
     - Submission details
     - Video information
   - **Tabs**:
     - "Submissions" (default)
     - "Manage One-on-Ones"

**Key Features:**
- Prioritized new submissions
- Tab-based navigation
- Submission management

---

### 3. Mentor Receiving & Processing Feedback Request

**Flow Steps:**
1. Player/Coach submits video for feedback
2. System assigns mentor (or admin assigns manually)
3. Mentor receives email notification:
   - Link to submission
   - Video details
   - Player information
4. Mentor clicks email link or navigates to dashboard
5. Sees new submission in "New Submissions" section
6. Clicks on submission to view:
   - Video playback
   - Player information
   - Submission details
   - Notes from player/coach

**Key Features:**
- Email notifications
- Direct links to submissions
- Video playback
- Submission details

---

### 4. Mentor Providing Feedback

**Flow Steps:**
1. Mentor views submission details
2. Watches video
3. Clicks "Provide Feedback" or similar action
4. Fills out feedback form:
   - Feedback text (detailed analysis)
   - Rating (1-5 stars)
   - Internal notes (optional, not visible to player)
5. Can upload feedback video (optional)
6. Submits feedback
7. Submission status updates to "completed"
8. Player receives notification
9. Feedback appears in player's dashboard

**Key Features:**
- Detailed feedback form
- Rating system
- Video feedback option
- Internal notes
- Status updates

---

### 5. Mentor Managing Availability

**Flow Steps:**
1. Mentor navigates to "Calendar" in sidebar
2. Clicks "Manage One-on-Ones" tab
3. Sees "My Availability" section
4. Clicks "Add Availability"
5. Sets availability:
   - Date and time range
   - Duration (default: 60 minutes)
   - Recurring pattern (daily, weekly, monthly) - optional
   - Recurring end date (if recurring)
6. Saves availability
7. Time slots appear in calendar
8. Players/Coaches can book these slots

**Key Features:**
- Flexible availability setting
- Recurring slots
- Calendar integration
- Real-time availability

---

### 6. Mentor Managing One-on-One Sessions

**Flow Steps:**
1. Mentor navigates to "Calendar" → "Manage One-on-Ones"
2. Clicks "Upcoming Meetings" tab
3. Sees list of booked sessions:
   - Date and time
   - Player/Coach name and profile picture
   - Status (confirmed, pending, etc.)
4. For each session, can:
   - **Add Meeting Link**:
     - Clicks "Add Meeting Link"
     - Enters Zoom/Google Meet/etc. link
     - Saves link
   - **Cancel Session**:
     - Clicks "Cancel"
     - Confirms cancellation
     - Player receives email with:
       - Cancellation notice
       - One-time secure reschedule link
     - Payment is refunded (if applicable)

**Key Features:**
- Session management
- Meeting link addition
- Cancellation with email notification
- Secure reschedule links
- Payment refund handling

---

### 7. Mentor Viewing Submission History

**Flow Steps:**
1. Mentor navigates to dashboard
2. Clicks "Feedback" tab in sidebar (if available)
3. Sees detailed spreadsheet-style list:
   - All submissions (past and present)
   - Status
   - Player information
   - Submission dates
   - Completion dates
4. Can filter and sort submissions
5. Clicks on submission to view full details

**Key Features:**
- Comprehensive submission history
- Spreadsheet-style layout
- Filtering and sorting
- Detailed views

---

## Admin Flows

### 1. Admin Access & Dashboard

**Flow Steps:**
1. Admin logs in (role: 'admin')
2. Redirected to `/dashboard` (admin dashboard)
3. Sees admin overview:
   - Total users count
   - Total teams count
   - Total mentors count
   - Revenue statistics
   - Submissions count
   - Sessions count
4. Navigation shows admin-specific links:
   - Admin Dashboard
   - Users
   - Teams
   - Mentors

**Key Features:**
- Admin-only dashboard
- Key metrics overview
- Quick navigation

---

### 2. Admin Managing Users

**Flow Steps:**
1. Admin navigates to "Users" in sidebar
2. Sees user management page (`/dashboard/admin/users`)
3. Views table of all users:
   - Name, email, role
   - Account status (active/inactive)
   - Created date
   - Last login
4. Can filter by role (all, player, coach, mentor, admin)
5. For each user, can:
   - **Edit User**:
     - Click "Edit"
     - Update name, email, phone
     - Change role
     - Activate/deactivate account
     - Save changes
   - **Reset Password**:
     - Click "Reset Password"
     - System generates password reset email
     - User receives email with reset link
   - **View Stats**:
     - Click "View Stats"
     - See user activity, submissions, payments

**Key Features:**
- Complete user management
- Role changes
- Account activation/deactivation
- Password reset
- User statistics

---

### 3. Admin Managing Teams

**Flow Steps:**
1. Admin navigates to "Teams" in sidebar
2. Sees team management page (`/dashboard/admin/teams`)
3. Views list of all teams:
   - Team name
   - Coach name
   - Member count
   - Created date
4. For each team, can:
   - **View Members**:
     - Click "View Members"
     - Sees all players in team
     - Player names and numbers
   - **Delete Team**:
     - Click "Delete"
     - Confirms deletion
     - Team is removed
     - Players' team affiliations are removed

**Key Features:**
- Team overview
- Member viewing
- Team deletion
- Affiliation management

---

### 4. Admin Managing Mentors

**Flow Steps:**
1. Admin navigates to "Mentors" in sidebar
2. Sees mentor management page (`/dashboard/admin/mentors`)
3. Views list of all mentors:
   - Name, email
   - Profile information
   - Active status
4. For each mentor, can:
   - **Edit Mentor**:
     - Click "Edit"
     - Update profile information
     - Activate/deactivate
     - Save changes
   - **View Stats**:
     - Click "View Stats"
     - See:
       - Total submissions
       - Completed submissions
       - Average rating
       - Sessions booked
       - Revenue generated

**Key Features:**
- Mentor profile management
- Statistics viewing
- Activation control

---

### 5. Admin Assigning Mentors to Submissions

**Flow Steps:**
1. Admin views submission (via user management or direct access)
2. Sees unassigned submission
3. Selects mentor from dropdown
4. Assigns mentor to submission
5. Mentor receives email notification
6. Submission status updates to "assigned"

**Key Features:**
- Manual mentor assignment
- Email notifications
- Status updates

---

## Shared Flows

### 1. Login Flow

**Flow Steps:**
1. User visits homepage
2. Clicks "Log In" in navigation
3. Redirected to `/login`
4. Enters email and password
5. Clicks "Sign In"
6. If credentials are valid:
   - User is authenticated
   - Redirected to `/dashboard`
   - Role-based dashboard loads
7. If credentials are invalid:
   - Error message displayed
   - User can try again or reset password

**Key Features:**
- Secure authentication
- Role-based redirects
- Error handling
- Password reset option

---

### 2. Password Reset Flow

**Flow Steps:**
1. User clicks "Forgot Password?" on login page
2. Redirected to `/forgot-password`
3. Enters email address
4. Clicks "Send Reset Link"
5. Receives email with password reset link
6. Clicks link in email
7. Redirected to password reset page
8. Enters new password
9. Confirms new password
10. Password is updated
11. Redirected to login page

**Key Features:**
- Email-based reset
- Secure token system
- Password confirmation
- Automatic redirect

---

### 3. Contact/Support Flow

**Flow Steps:**
1. User clicks "Need help with your order?" or navigates to `/contact`
2. Sees contact form
3. Fills out form:
   - Name
   - Email
   - Subject
   - Message
4. Submits form
5. Receives confirmation
6. Support team receives email

**Key Features:**
- Easy access from dashboard
- Contact form
- Email notifications

---

### 4. Profile Photo Management

**Flow Steps:**
1. User navigates to Account Settings (`/dashboard/settings`)
2. Sees current profile photo (or initials)
3. Clicks "Change Photo" or upload area
4. Selects image file
5. Image preview appears
6. Clicks "Save" or "Update"
7. Image is uploaded to storage
8. Profile photo updates across:
   - Dashboard welcome overlay
   - Profile dropdown in navbar
   - All user-facing displays

**Key Features:**
- Image upload
- Preview before save
- Automatic updates
- Fallback to initials

---

## Payment Flows

### 1. Video Submission Payment ($50)

**Flow Steps:**
1. User uploads video and fills form
2. Clicks "Checkout ($50)"
3. Video is uploaded (status: `pending`)
4. Redirected to Stripe Checkout
5. Enters payment information
6. Completes payment
7. Stripe webhook processes payment
8. Video status updates to `ready`
9. Feedback submission is created
10. Mentor is assigned
11. User redirected to dashboard with success message

**Key Features:**
- Secure Stripe integration
- Webhook processing
- Automatic status updates
- Email notifications

---

### 2. One-on-One Session Payment ($150)

**Flow Steps:**
1. User selects time slot
2. Clicks "Book Session"
3. Redirected to Stripe Checkout ($150)
4. Completes payment
5. Session status updates to "confirmed"
6. Both user and mentor receive confirmation emails
7. Session appears in "My Appointments"

**Key Features:**
- Session-specific payment
- Dual email notifications
- Automatic booking confirmation

---

### 3. Payment Refund (Session Cancellation)

**Flow Steps:**
1. Mentor cancels session
2. System processes cancellation
3. Payment refund is initiated (if applicable)
4. User receives cancellation email with refund notice
5. Refund appears in Stripe
6. User's payment method is refunded

**Key Features:**
- Automatic refund processing
- Email notifications
- Stripe integration

---

## Email Notification Flows

### 1. New Feedback Submission Notification

**Recipient:** Assigned Mentor
**Trigger:** Video submitted and mentor assigned
**Content:**
- Submission details
- Video information
- Player information
- Direct link to submission

---

### 2. Feedback Completed Notification

**Recipient:** Player/Coach
**Trigger:** Mentor submits feedback
**Content:**
- Feedback summary
- Rating
- Link to view full feedback

---

### 3. Session Booking Confirmation

**Recipients:** User and Mentor
**Trigger:** Session booked and payment successful
**Content:**
- Session date and time
- Mentor/User information
- Meeting details
- Link to view session

---

### 4. Session Cancellation Notification

**Recipient:** User
**Trigger:** Mentor cancels session
**Content:**
- Cancellation notice
- Refund information
- Secure one-time reschedule link

---

### 5. Password Reset Email

**Recipient:** User
**Trigger:** User requests password reset
**Content:**
- Reset link
- Expiration time
- Security instructions

---

## Key System Features

### Access Control
- **Role-Based Access:** Each user type sees only relevant features
- **Payment Gates:** Education content requires $50 payment
- **Monthly Limits:** Coaches limited to 15 videos per month

### Data Management
- **Team Affiliations:** Players automatically show/hide team info
- **Profile Updates:** Real-time updates across all displays
- **Status Tracking:** Comprehensive status system for all entities

### User Experience
- **Personalized Dashboards:** Welcome messages, profile photos
- **Filtering & Search:** Multiple filter options throughout
- **Responsive Design:** Mobile-friendly interface
- **Smooth Animations:** Transitions and hover effects
- **Help Links:** Easy access to support

---

## Technical Notes

### Authentication
- Supabase Auth for user management
- Email verification (optional)
- Password reset via email
- Session management

### Storage
- Supabase Storage for videos and profile photos
- File size limits enforced
- Secure access policies

### Payments
- Stripe integration for all payments
- Webhook processing for status updates
- Refund handling

### Email
- Resend API for email notifications
- Template-based emails
- Secure links with tokens

---

*Last Updated: [Current Date]*
*Version: 1.0*
