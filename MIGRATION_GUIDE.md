# MVP-IQ Migration Guide

This guide will help you migrate your existing app to support the MVP-IQ workflow.

## Database Migration

1. **Run the new schema migration:**
   ```sql
   -- Copy and paste the contents of supabase/mvp-iq-schema.sql into your Supabase SQL Editor
   ```

2. **Update existing data:**
   - Existing mentors will continue to work as "pros"
   - You may want to create coach/admin accounts manually or update existing profiles

## Key Changes

### 1. New Roles
- **Coach/Admin**: Can create teams, invite players, submit videos on behalf of players
- **Player**: Can submit videos and view feedback
- **Mentor/Pro**: Provides feedback via email workflow

### 2. Video Submission
- Changed from file upload to **URL-based submission**
- Added `player_numbers` field
- Added `player_notes` field for coach instructions

### 3. Team/Roster System
- Coaches can create teams
- Coaches can invite players to their roster
- Players are automatically linked to teams when invited

### 4. Navigation
- New sidebar navigation with icons:
  - **Home**: Main dashboard
  - **Schedule Call** (coaches only): Calendly integration
  - **Education**: Training videos

### 5. Email Workflow for Pros
- When a video is submitted, an email draft is sent to the assigned pro
- Pros reply to the email with feedback
- The platform processes the email reply and updates the submission

### 6. Education Section
- New section for training videos
- Filterable by player position
- Accessible to all users

## Setup Steps

### 1. Environment Variables
Make sure you have these set:
```env
RESEND_API_KEY=your_resend_key
RESEND_FROM_EMAIL=your_verified_email@domain.com
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Calendly Setup
For each pro/mentor:
1. They need to set up their Calendly account
2. Add their Calendly URL to the `pro_calendly_links` table:
   ```sql
   INSERT INTO pro_calendly_links (pro_id, calendly_url, is_active)
   VALUES ('pro-user-id', 'https://calendly.com/username', true);
   ```

### 3. Education Videos
Add training videos via SQL or create an admin interface:
```sql
INSERT INTO education_videos (title, video_url, position, description)
VALUES ('Shooting Techniques', 'https://youtube.com/...', 'Forward', 'Learn proper shooting form');
```

### 4. Email Reply Processing (Future)
Currently, the email draft workflow sends emails to pros. To process replies:
- Set up email webhook (Resend Inbound or similar)
- Create endpoint to parse email replies
- Extract feedback text and video URL from reply
- Update submission in database

## Testing

1. **Create a Coach Account:**
   - Register with role "Coach/Admin"
   - Create a team
   - Invite a player

2. **Test Video Submission:**
   - As coach: Submit a video URL
   - As player: Submit a video URL
   - Check that submissions appear in dashboard

3. **Test Email Draft:**
   - Submit a video for feedback
   - Check pro's email inbox for draft
   - Verify submission status is "assigned"

4. **Test Education Section:**
   - Navigate to Education
   - Filter by position
   - Verify videos display correctly

## Notes

- The old file upload system is still available but not used in the new workflow
- Payment system is still in place but may not be needed for MVP-IQ
- Email reply processing needs to be implemented for full workflow
