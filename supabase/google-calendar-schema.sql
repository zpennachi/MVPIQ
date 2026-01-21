-- Google Calendar Integration Schema
-- Run this SQL in your Supabase SQL Editor

-- Add Google Calendar integration fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS google_calendar_connected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS google_calendar_id TEXT,
ADD COLUMN IF NOT EXISTS google_calendar_access_token TEXT,
ADD COLUMN IF NOT EXISTS google_calendar_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_calendar_token_expires_at TIMESTAMP WITH TIME ZONE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_google_calendar_connected 
ON profiles(google_calendar_connected) 
WHERE google_calendar_connected = true;

-- Add google_event_id to booked_sessions for tracking
ALTER TABLE booked_sessions
ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- Add index for google_event_id lookups
CREATE INDEX IF NOT EXISTS idx_booked_sessions_google_event_id 
ON booked_sessions(google_event_id) 
WHERE google_event_id IS NOT NULL;
