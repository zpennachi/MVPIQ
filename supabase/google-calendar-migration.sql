-- Google Calendar Integration Migration
-- Run this to add Google Calendar support

-- Add Google Calendar fields to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS google_calendar_id TEXT,
  ADD COLUMN IF NOT EXISTS google_calendar_access_token TEXT, -- Consider encrypting in production
  ADD COLUMN IF NOT EXISTS google_calendar_refresh_token TEXT, -- Consider encrypting in production
  ADD COLUMN IF NOT EXISTS google_calendar_connected BOOLEAN DEFAULT false;

-- Add google_event_id to booked_sessions
ALTER TABLE booked_sessions
  ADD COLUMN IF NOT EXISTS google_event_id TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_booked_sessions_google_event_id 
  ON booked_sessions(google_event_id);

CREATE INDEX IF NOT EXISTS idx_profiles_google_calendar_connected 
  ON profiles(google_calendar_connected) 
  WHERE google_calendar_connected = true;

-- Note: We're NOT dropping availability_slots table yet
-- This allows for a gradual migration or fallback
-- You can drop it later once all mentors have connected Google Calendar
