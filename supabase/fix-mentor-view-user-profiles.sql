-- Fix: Allow mentors to view profiles of users who have booked sessions with them
-- This is needed for mentors to see user names in their dashboard

-- Create policy to allow mentors to view profiles of users who booked sessions with them
CREATE POLICY "Mentors can view profiles of users with booked sessions"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM booked_sessions
      WHERE booked_sessions.mentor_id = auth.uid()
        AND booked_sessions.user_id = profiles.id
        AND booked_sessions.status IN ('pending', 'confirmed')
    )
    OR
    -- Also allow viewing if user has any submission assigned to this mentor
    EXISTS (
      SELECT 1 FROM feedback_submissions
      WHERE feedback_submissions.mentor_id = auth.uid()
        AND feedback_submissions.player_id = profiles.id
    )
  );
