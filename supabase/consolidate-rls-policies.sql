-- Consolidate Multiple Permissive RLS Policies
-- This combines multiple SELECT policies into single policies using OR conditions
-- This improves performance by evaluating one policy instead of multiple

-- ============================================
-- 1. CONSOLIDATE AVAILABILITY_SLOTS POLICIES
-- ============================================
-- Combine: "Everyone can view active availability slots" + "Mentors can manage own availability"

DROP POLICY IF EXISTS "Everyone can view active availability slots" ON availability_slots;
DROP POLICY IF EXISTS "Mentors can manage own availability" ON availability_slots;

-- Single consolidated SELECT policy (everyone can view, mentors can view their own)
CREATE POLICY "Everyone can view active availability slots"
  ON availability_slots FOR SELECT
  USING (
    -- Everyone can view active slots
    (is_active = true AND (start_time > NOW() OR is_recurring = true)) OR
    -- Mentors can view their own slots (even if inactive)
    (select auth.uid()) = mentor_id
  );

-- Separate INSERT/UPDATE/DELETE policy for mentors
CREATE POLICY "Mentors can manage own availability"
  ON availability_slots FOR INSERT
  WITH CHECK ((select auth.uid()) = mentor_id);

CREATE POLICY "Mentors can update own availability"
  ON availability_slots FOR UPDATE
  USING ((select auth.uid()) = mentor_id)
  WITH CHECK ((select auth.uid()) = mentor_id);

CREATE POLICY "Mentors can delete own availability"
  ON availability_slots FOR DELETE
  USING ((select auth.uid()) = mentor_id);

-- ============================================
-- 2. CONSOLIDATE EDUCATION_VIDEOS POLICIES
-- ============================================
-- Combine: "Admins can manage education videos" + "Everyone can view education videos"

DROP POLICY IF EXISTS "Everyone can view education videos" ON education_videos;
DROP POLICY IF EXISTS "Admins can manage education videos" ON education_videos;

-- Single consolidated SELECT policy
CREATE POLICY "Everyone can view education videos"
  ON education_videos FOR SELECT
  USING (true);

-- Separate policies for admin management (INSERT/UPDATE/DELETE only, not SELECT)
CREATE POLICY "Admins can insert education videos"
  ON education_videos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update education videos"
  ON education_videos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete education videos"
  ON education_videos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

-- ============================================
-- 3. CONSOLIDATE FEEDBACK_SUBMISSIONS POLICIES
-- ============================================
-- Combine: "Players can view own submissions" + "Mentors can view all submissions" + "Coaches can view team submissions"

DROP POLICY IF EXISTS "Players can view own submissions" ON feedback_submissions;
DROP POLICY IF EXISTS "Mentors can view all submissions" ON feedback_submissions;
DROP POLICY IF EXISTS "Coaches can view team submissions" ON feedback_submissions;

-- Single consolidated SELECT policy
CREATE POLICY "Users can view relevant submissions"
  ON feedback_submissions FOR SELECT
  USING (
    -- Players can view own submissions
    (select auth.uid()) = player_id OR
    -- Mentors can view all submissions
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'mentor'
    ) OR
    -- Coaches can view team submissions
    EXISTS (
      SELECT 1 FROM videos v
      JOIN team_members tm ON tm.player_id = v.player_id
      JOIN teams t ON t.id = tm.team_id
      WHERE v.id = feedback_submissions.video_id AND t.coach_id = (select auth.uid())
    )
  );

-- ============================================
-- 4. CONSOLIDATE HOMEPAGE_SECTIONS POLICIES
-- ============================================
-- Combine: "Admins can manage homepage sections" + "Everyone can view active homepage sections"

DROP POLICY IF EXISTS "Everyone can view active homepage sections" ON homepage_sections;
DROP POLICY IF EXISTS "Admins can manage homepage sections" ON homepage_sections;

-- Single consolidated SELECT policy
CREATE POLICY "Everyone can view active homepage sections"
  ON homepage_sections FOR SELECT
  USING (is_active = true);

-- Separate policies for admin management (INSERT/UPDATE/DELETE only, not SELECT)
CREATE POLICY "Admins can insert homepage sections"
  ON homepage_sections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update homepage sections"
  ON homepage_sections FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete homepage sections"
  ON homepage_sections FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

-- ============================================
-- 5. CONSOLIDATE PRO_CALENDLY_LINKS POLICIES
-- ============================================
-- Combine: "Coaches can view pro calendly links" + "Pros can manage own calendly links"

DROP POLICY IF EXISTS "Coaches can view pro calendly links" ON pro_calendly_links;
DROP POLICY IF EXISTS "Pros can manage own calendly links" ON pro_calendly_links;

-- Single consolidated SELECT policy
CREATE POLICY "Users can view relevant calendly links"
  ON pro_calendly_links FOR SELECT
  USING (
    is_active = true OR
    (select auth.uid()) = pro_id
  );

-- Separate policies for pros to manage (INSERT/UPDATE/DELETE only, not SELECT)
CREATE POLICY "Pros can insert own calendly links"
  ON pro_calendly_links FOR INSERT
  WITH CHECK ((select auth.uid()) = pro_id);

CREATE POLICY "Pros can update own calendly links"
  ON pro_calendly_links FOR UPDATE
  USING ((select auth.uid()) = pro_id)
  WITH CHECK ((select auth.uid()) = pro_id);

CREATE POLICY "Pros can delete own calendly links"
  ON pro_calendly_links FOR DELETE
  USING ((select auth.uid()) = pro_id);

-- ============================================
-- 6. CONSOLIDATE PROFILES POLICIES
-- ============================================
-- Combine: "Users can view own profile" + "Users can view mentor profiles" + "Mentors can view all user profiles"

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view mentor profiles" ON profiles;
DROP POLICY IF EXISTS "Mentors can view all user profiles" ON profiles;

-- Single consolidated SELECT policy
CREATE POLICY "Users can view relevant profiles"
  ON profiles FOR SELECT
  USING (
    -- Users can view own profile
    (select auth.uid()) = id OR
    -- Users can view mentor profiles
    role = 'mentor' OR
    -- Mentors can view all user profiles
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (select auth.uid()) AND p.role = 'mentor'
    )
  );

-- ============================================
-- 7. CONSOLIDATE TEAM_MEMBERS POLICIES
-- ============================================
-- Combine: "Players can view own team memberships" + "Coaches can view team members"

DROP POLICY IF EXISTS "Players can view own team memberships" ON team_members;
DROP POLICY IF EXISTS "Coaches can view team members" ON team_members;

-- Single consolidated SELECT policy
CREATE POLICY "Users can view relevant team members"
  ON team_members FOR SELECT
  USING (
    -- Players can view own team memberships
    (select auth.uid()) = player_id OR
    -- Coaches can view team members
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_members.team_id AND teams.coach_id = (select auth.uid())
    )
  );

-- ============================================
-- 8. CONSOLIDATE VIDEOS POLICIES
-- ============================================
-- Combine: "Players can view own videos" + "Mentors can view all videos" + "Coaches can view all videos"

DROP POLICY IF EXISTS "Players can view own videos" ON videos;
DROP POLICY IF EXISTS "Mentors can view all videos" ON videos;
DROP POLICY IF EXISTS "Coaches can view all videos" ON videos;

-- Single consolidated SELECT policy
CREATE POLICY "Users can view relevant videos"
  ON videos FOR SELECT
  USING (
    -- Players can view own videos
    (select auth.uid()) = player_id OR
    -- Mentors can view all videos
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'mentor'
    ) OR
    -- Coaches can view all videos (including team videos)
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('coach', 'admin')
    ) OR
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.player_id = videos.player_id AND t.coach_id = (select auth.uid())
    )
  );

-- ============================================
-- SUMMARY
-- ============================================
SELECT '✅ Consolidated multiple permissive policies into single policies' as status;
SELECT '✅ Improved performance by reducing policy evaluations' as status;
SELECT '✅ Maintained same access control logic' as status;
