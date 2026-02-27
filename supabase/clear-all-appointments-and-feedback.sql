-- Clear All Appointments and Feedback Entries
-- WARNING: This will delete ALL appointments and feedback submissions
-- Run this in your Supabase SQL Editor

-- Delete all booked sessions (appointments)
DELETE FROM booked_sessions;

-- Delete all feedback submissions
DELETE FROM feedback_submissions;

-- Delete all videos (since they're linked to feedback submissions)
DELETE FROM videos;

-- Delete all payments related to submissions
DELETE FROM payments 
WHERE submission_id IS NOT NULL;

-- Optional: Reset any session credits if you want a completely fresh start
-- DELETE FROM session_credits;

-- Verify deletions
SELECT 
  (SELECT COUNT(*) FROM booked_sessions) as remaining_sessions,
  (SELECT COUNT(*) FROM feedback_submissions) as remaining_submissions,
  (SELECT COUNT(*) FROM videos) as remaining_videos,
  (SELECT COUNT(*) FROM payments WHERE submission_id IS NOT NULL) as remaining_payments;
