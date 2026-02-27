-- Fix RLS Performance Issues
-- This script fixes "Auth RLS Initialization Plan" warnings by using (select auth.uid())
-- This prevents auth.uid() from being re-evaluated for each row, improving performance

-- ============================================
-- 1. FIX PROFILES POLICIES
-- ============================================

-- Drop and recreate "Users can view own profile"
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING ((select auth.uid()) = id);

-- Drop and recreate "Users can update own profile"
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING ((select auth.uid()) = id);

-- Drop and recreate "Mentors can view all user profiles" (if exists)
DROP POLICY IF EXISTS "Mentors can view all user profiles" ON profiles;
CREATE POLICY "Mentors can view all user profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (select auth.uid()) AND p.role = 'mentor'
    )
  );

-- ============================================
-- 2. FIX VIDEOS POLICIES
-- ============================================

-- Drop and recreate "Players can view own videos"
DROP POLICY IF EXISTS "Players can view own videos" ON videos;
CREATE POLICY "Players can view own videos"
  ON videos FOR SELECT
  USING ((select auth.uid()) = player_id);

-- Drop and recreate "Players can insert own videos"
DROP POLICY IF EXISTS "Players can insert own videos" ON videos;
CREATE POLICY "Players can insert own videos"
  ON videos FOR INSERT
  WITH CHECK ((select auth.uid()) = player_id);

-- Drop and recreate "Players can update own videos"
DROP POLICY IF EXISTS "Players can update own videos" ON videos;
CREATE POLICY "Players can update own videos"
  ON videos FOR UPDATE
  USING ((select auth.uid()) = player_id);

-- Drop and recreate "Mentors can view all videos"
DROP POLICY IF EXISTS "Mentors can view all videos" ON videos;
CREATE POLICY "Mentors can view all videos"
  ON videos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'mentor'
    )
  );

-- Drop and recreate "Coaches can view all videos"
DROP POLICY IF EXISTS "Coaches can view all videos" ON videos;
CREATE POLICY "Coaches can view all videos"
  ON videos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('coach', 'admin')
    ) OR
    (select auth.uid()) = player_id OR
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.player_id = videos.player_id AND t.coach_id = (select auth.uid())
    )
  );

-- ============================================
-- 3. FIX FEEDBACK_SUBMISSIONS POLICIES
-- ============================================

-- Drop and recreate "Players can view own submissions"
DROP POLICY IF EXISTS "Players can view own submissions" ON feedback_submissions;
CREATE POLICY "Players can view own submissions"
  ON feedback_submissions FOR SELECT
  USING ((select auth.uid()) = player_id);

-- Drop and recreate "Players can create own submissions"
DROP POLICY IF EXISTS "Players can create own submissions" ON feedback_submissions;
CREATE POLICY "Players can create own submissions"
  ON feedback_submissions FOR INSERT
  WITH CHECK ((select auth.uid()) = player_id);

-- Drop and recreate "Mentors can view all submissions"
DROP POLICY IF EXISTS "Mentors can view all submissions" ON feedback_submissions;
CREATE POLICY "Mentors can view all submissions"
  ON feedback_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'mentor'
    )
  );

-- Drop and recreate "Mentors can update submissions"
DROP POLICY IF EXISTS "Mentors can update submissions" ON feedback_submissions;
CREATE POLICY "Mentors can update submissions"
  ON feedback_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'mentor'
    )
  );

-- Drop and recreate "Coaches can view team submissions"
DROP POLICY IF EXISTS "Coaches can view team submissions" ON feedback_submissions;
CREATE POLICY "Coaches can view team submissions"
  ON feedback_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos v
      JOIN team_members tm ON tm.player_id = v.player_id
      JOIN teams t ON t.id = tm.team_id
      WHERE v.id = feedback_submissions.video_id AND t.coach_id = (select auth.uid())
    )
  );

-- ============================================
-- 4. FIX PAYMENTS POLICIES
-- ============================================

-- Drop and recreate "Players can view own payments"
DROP POLICY IF EXISTS "Players can view own payments" ON payments;
CREATE POLICY "Players can view own payments"
  ON payments FOR SELECT
  USING ((select auth.uid()) = player_id);

-- Drop and recreate "Players can create own payments"
DROP POLICY IF EXISTS "Players can create own payments" ON payments;
CREATE POLICY "Players can create own payments"
  ON payments FOR INSERT
  WITH CHECK ((select auth.uid()) = player_id);

-- ============================================
-- 5. FIX TEAMS POLICIES
-- ============================================

-- Drop and recreate "Coaches can view own teams"
DROP POLICY IF EXISTS "Coaches can view own teams" ON teams;
CREATE POLICY "Coaches can view own teams"
  ON teams FOR SELECT
  USING ((select auth.uid()) = coach_id);

-- Drop and recreate "Coaches can create teams"
DROP POLICY IF EXISTS "Coaches can create teams" ON teams;
CREATE POLICY "Coaches can create teams"
  ON teams FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('coach', 'admin')
    )
  );

-- Drop and recreate "Coaches can update own teams"
DROP POLICY IF EXISTS "Coaches can update own teams" ON teams;
CREATE POLICY "Coaches can update own teams"
  ON teams FOR UPDATE
  USING ((select auth.uid()) = coach_id);

-- ============================================
-- 6. FIX TEAM_MEMBERS POLICIES
-- ============================================

-- Drop and recreate "Players can view own team memberships"
DROP POLICY IF EXISTS "Players can view own team memberships" ON team_members;
CREATE POLICY "Players can view own team memberships"
  ON team_members FOR SELECT
  USING ((select auth.uid()) = player_id);

-- Drop and recreate "Coaches can view team members"
DROP POLICY IF EXISTS "Coaches can view team members" ON team_members;
CREATE POLICY "Coaches can view team members"
  ON team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_members.team_id AND teams.coach_id = (select auth.uid())
    )
  );

-- Drop and recreate "Coaches can add players to teams"
DROP POLICY IF EXISTS "Coaches can add players to teams" ON team_members;
CREATE POLICY "Coaches can add players to teams"
  ON team_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_id AND teams.coach_id = (select auth.uid())
    )
  );

-- ============================================
-- 7. FIX EDUCATION_VIDEOS POLICIES
-- ============================================

-- Drop and recreate "Admins can manage education videos"
DROP POLICY IF EXISTS "Admins can manage education videos" ON education_videos;
CREATE POLICY "Admins can manage education videos"
  ON education_videos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

-- ============================================
-- 8. FIX SUBSCRIPTIONS POLICIES
-- ============================================

-- Drop and recreate "Users can view own subscriptions"
DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  USING ((select auth.uid()) = user_id);

-- ============================================
-- 9. FIX PRO_CALENDLY_LINKS POLICIES
-- ============================================

-- Drop and recreate "Pros can manage own calendly links"
DROP POLICY IF EXISTS "Pros can manage own calendly links" ON pro_calendly_links;
CREATE POLICY "Pros can manage own calendly links"
  ON pro_calendly_links FOR ALL
  USING ((select auth.uid()) = pro_id);

-- ============================================
-- 10. FIX AVAILABILITY_SLOTS POLICIES
-- ============================================

-- Drop and recreate "Mentors can manage own availability"
DROP POLICY IF EXISTS "Mentors can manage own availability" ON availability_slots;
CREATE POLICY "Mentors can manage own availability"
  ON availability_slots FOR ALL
  USING ((select auth.uid()) = mentor_id);

-- ============================================
-- 11. FIX BOOKED_SESSIONS POLICIES
-- ============================================

-- Drop and recreate "Users can view own booked sessions"
DROP POLICY IF EXISTS "Users can view own booked sessions" ON booked_sessions;
CREATE POLICY "Users can view own booked sessions"
  ON booked_sessions FOR SELECT
  USING ((select auth.uid()) = user_id OR (select auth.uid()) = mentor_id);

-- Drop and recreate "Users can create bookings"
DROP POLICY IF EXISTS "Users can create bookings" ON booked_sessions;
CREATE POLICY "Users can create bookings"
  ON booked_sessions FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

-- Drop and recreate "Users can update own bookings"
DROP POLICY IF EXISTS "Users can update own bookings" ON booked_sessions;
CREATE POLICY "Users can update own bookings"
  ON booked_sessions FOR UPDATE
  USING ((select auth.uid()) = user_id OR (select auth.uid()) = mentor_id);

-- ============================================
-- 12. FIX SESSION_CREDITS POLICIES
-- ============================================

-- Drop and recreate "Users can view own credits"
DROP POLICY IF EXISTS "Users can view own credits" ON session_credits;
CREATE POLICY "Users can view own credits"
  ON session_credits FOR SELECT
  USING ((select auth.uid()) = user_id);

-- Drop and recreate "Users can update own unused credits"
DROP POLICY IF EXISTS "Users can update own unused credits" ON session_credits;
CREATE POLICY "Users can update own unused credits"
  ON session_credits FOR UPDATE
  USING ((select auth.uid()) = user_id AND used = false);

-- ============================================
-- 13. FIX HOMEPAGE_SECTIONS POLICIES
-- ============================================

-- Drop and recreate "Admins can manage homepage sections"
DROP POLICY IF EXISTS "Admins can manage homepage sections" ON homepage_sections;
CREATE POLICY "Admins can manage homepage sections"
  ON homepage_sections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

-- ============================================
-- SUMMARY
-- ============================================
SELECT '✅ Fixed all RLS policies to use (select auth.uid()) for better performance' as status;
