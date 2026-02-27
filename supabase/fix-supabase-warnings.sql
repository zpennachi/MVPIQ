-- Fix Supabase Warnings and Issues
-- Run this to address the warnings shown in Supabase Dashboard

-- ============================================
-- 1. FIX FUNCTION SEARCH PATH (Security)
-- ============================================
-- Functions should have immutable search_path to prevent search path attacks

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'player')
  );
  RETURN NEW;
END;
$$;

-- Fix is_slot_available function
CREATE OR REPLACE FUNCTION public.is_slot_available(
  p_slot_id UUID,
  p_start_time TIMESTAMP WITH TIME ZONE,
  p_end_time TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  slot_start TIMESTAMP WITH TIME ZONE;
  slot_end TIMESTAMP WITH TIME ZONE;
  conflicting_count INTEGER;
BEGIN
  -- Get slot times
  SELECT start_time, end_time INTO slot_start, slot_end
  FROM availability_slots
  WHERE id = p_slot_id AND is_active = true;

  IF slot_start IS NULL THEN
    RETURN false;
  END IF;

  -- Check if requested time is within slot
  IF p_start_time < slot_start OR p_end_time > slot_end THEN
    RETURN false;
  END IF;

  -- Check for conflicting bookings
  SELECT COUNT(*) INTO conflicting_count
  FROM booked_sessions
  WHERE availability_slot_id = p_slot_id
    AND status IN ('pending', 'confirmed')
    AND (
      (start_time <= p_start_time AND end_time > p_start_time) OR
      (start_time < p_end_time AND end_time >= p_end_time) OR
      (start_time >= p_start_time AND end_time <= p_end_time)
    );

  RETURN conflicting_count = 0;
END;
$$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================
-- 2. ADD MISSING INDEXES ON FOREIGN KEYS (Performance)
-- ============================================

-- Indexes for booked_sessions foreign keys
CREATE INDEX IF NOT EXISTS idx_booked_sessions_availability_slot_id 
  ON booked_sessions(availability_slot_id);

-- Indexes for education_videos foreign keys
CREATE INDEX IF NOT EXISTS idx_education_videos_created_by 
  ON education_videos(created_by);

-- Indexes for feedback_submissions foreign keys
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_video_id 
  ON feedback_submissions(video_id);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_player_id 
  ON feedback_submissions(player_id);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_mentor_id 
  ON feedback_submissions(mentor_id);

-- Indexes for session_credits foreign keys
CREATE INDEX IF NOT EXISTS idx_session_credits_user_id 
  ON session_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_session_credits_source_session_id 
  ON session_credits(source_session_id);

-- Indexes for team_members foreign keys
CREATE INDEX IF NOT EXISTS idx_team_members_team_id 
  ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_player_id 
  ON team_members(player_id);

-- ============================================
-- 3. REMOVE UNUSED INDEXES (Optional - Performance)
-- ============================================
-- These indexes aren't being used and can be dropped to save space
-- Uncomment if you want to remove them (they can always be recreated)

-- DROP INDEX IF EXISTS idx_education_videos_created_by; -- Only if truly unused
-- DROP INDEX IF EXISTS idx_homepage_sections_position; -- Only if truly unused
-- DROP INDEX IF EXISTS idx_profiles_email; -- Only if truly unused (but email is unique, so probably keep)
-- DROP INDEX IF EXISTS idx_profiles_role; -- Only if truly unused
-- DROP INDEX IF EXISTS idx_session_credits_user_id; -- We just created this above, so keep it
-- DROP INDEX IF EXISTS idx_subscriptions_user_id; -- Only if truly unused
-- DROP INDEX IF EXISTS idx_videos_player_id; -- Only if truly unused

-- ============================================
-- 4. NOTES ON OTHER WARNINGS
-- ============================================

-- "Auth RLS Initialization Plan" warnings are informational
-- They indicate that RLS policies use auth.uid() which requires initialization
-- This is normal and expected - no action needed

-- "Multiple Permissive Policies" warnings indicate you have multiple SELECT policies
-- This is often intentional (e.g., different policies for different roles)
-- If you want to consolidate, you can combine them with OR conditions
-- Example: Instead of 2 separate policies, use one with OR:
--   USING (auth.uid() = user_id OR auth.uid() = mentor_id)

-- "Leaked Password Protection Disabled" - This is an Auth setting
-- Go to: Authentication > Settings > Password Protection
-- Enable "Leaked Password Protection" if you want to check passwords against breach databases

-- ============================================
-- SUMMARY
-- ============================================
SELECT '✅ Fixed function search paths (security)' as status
UNION ALL
SELECT '✅ Added missing foreign key indexes (performance)'
UNION ALL
SELECT 'ℹ️  Auth RLS warnings are informational (no action needed)'
UNION ALL
SELECT 'ℹ️  Multiple permissive policies are often intentional (review if needed)'
UNION ALL
SELECT 'ℹ️  Unused indexes can be dropped if confirmed unused (commented out above)';
