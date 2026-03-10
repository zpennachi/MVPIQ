-- Update the role check constraint on the profiles table
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('player', 'mentor', 'coach', 'admin', 'school', 'admin_mentor'));

-- IMPORTANT: Uncomment the line below and replace with Marvel Smith's actual email to assign the role!
-- UPDATE profiles SET role = 'admin_mentor' WHERE email = 'marvel@mvpiq.com';

-- Update Profiles Policy
DROP POLICY IF EXISTS "Users can view relevant profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view mentor profiles" ON profiles;
CREATE POLICY "Users can view relevant profiles"
  ON profiles FOR SELECT
  USING (
    (select auth.uid()) = id OR
    role IN ('mentor', 'admin_mentor') OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (select auth.uid()) AND p.role IN ('mentor', 'admin_mentor')
    )
  );

-- Update Education Videos Policies
DROP POLICY IF EXISTS "Admins can insert education videos" ON education_videos;
CREATE POLICY "Admins can insert education videos"
  ON education_videos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'admin_mentor')
    )
  );

DROP POLICY IF EXISTS "Admins can update education videos" ON education_videos;
CREATE POLICY "Admins can update education videos"
  ON education_videos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'admin_mentor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'admin_mentor')
    )
  );

DROP POLICY IF EXISTS "Admins can delete education videos" ON education_videos;
CREATE POLICY "Admins can delete education videos"
  ON education_videos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'admin_mentor')
    )
  );

-- Update Feedback Submissions Policies
DROP POLICY IF EXISTS "Users can view relevant submissions" ON feedback_submissions;
CREATE POLICY "Users can view relevant submissions"
  ON feedback_submissions FOR SELECT
  USING (
    (select auth.uid()) = player_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('mentor', 'admin_mentor')
    ) OR
    EXISTS (
      SELECT 1 FROM videos v
      JOIN team_members tm ON tm.player_id = v.player_id
      JOIN teams t ON t.id = tm.team_id
      WHERE v.id = feedback_submissions.video_id AND t.coach_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Mentors can update submissions" ON feedback_submissions;
CREATE POLICY "Mentors can update submissions"
  ON feedback_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('mentor', 'admin_mentor')
    )
  );

-- Update Homepage Sections Policies
DROP POLICY IF EXISTS "Admins can insert homepage sections" ON homepage_sections;
CREATE POLICY "Admins can insert homepage sections"
  ON homepage_sections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'admin_mentor')
    )
  );

DROP POLICY IF EXISTS "Admins can update homepage sections" ON homepage_sections;
CREATE POLICY "Admins can update homepage sections"
  ON homepage_sections FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'admin_mentor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'admin_mentor')
    )
  );

DROP POLICY IF EXISTS "Admins can delete homepage sections" ON homepage_sections;
CREATE POLICY "Admins can delete homepage sections"
  ON homepage_sections FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'admin_mentor')
    )
  );

-- Update Videos Policies
DROP POLICY IF EXISTS "Users can view relevant videos" ON videos;
CREATE POLICY "Users can view relevant videos"
  ON videos FOR SELECT
  USING (
    (select auth.uid()) = player_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('mentor', 'admin_mentor')
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('coach', 'admin', 'admin_mentor')
    ) OR
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.player_id = videos.player_id AND t.coach_id = (select auth.uid())
    )
  );

-- Update Teams Policies
DROP POLICY IF EXISTS "Coaches can create teams" ON teams;
CREATE POLICY "Coaches can create teams"
  ON teams FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('coach', 'admin', 'admin_mentor')
    )
  );

-- Update Storage Policies (if they already exist in this installation)
-- Videos bucket
DROP POLICY IF EXISTS "Mentors can view all videos" ON storage.objects;
CREATE POLICY "Mentors can view all videos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'videos' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('mentor', 'admin_mentor')
    )
  );

-- Education videos bucket
DROP POLICY IF EXISTS "Admins can upload education videos" ON storage.objects;
CREATE POLICY "Admins can upload education videos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'education-videos' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'admin_mentor')
    )
  );

DROP POLICY IF EXISTS "Admins can update education videos" ON storage.objects;
CREATE POLICY "Admins can update education videos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'education-videos' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'admin_mentor')
    )
  );

DROP POLICY IF EXISTS "Admins can delete education videos" ON storage.objects;
CREATE POLICY "Admins can delete education videos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'education-videos' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'admin_mentor')
    )
  );
