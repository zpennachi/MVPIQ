-- ============================================
-- DEV ONLY: Clear All Feedback & Sessions
-- ============================================
-- WARNING: This script will DELETE ALL data from:
--   - Feedback submissions
--   - One-on-one sessions (booked_sessions)
--   - Session credits
--   - Related payment records
--
-- Use this ONLY in development to reset the database
-- This will NOT delete user accounts, profiles, or videos
-- ============================================

-- Delete in order to respect foreign key constraints:

-- 1. Delete all session credits first (they reference booked_sessions)
DELETE FROM session_credits;

-- 2. Delete all booked sessions (one-on-one meetings)
DELETE FROM booked_sessions;

-- 3. Delete all payments related to feedback submissions
-- (Payments table references feedback_submissions via submission_id)
DELETE FROM payments WHERE submission_id IN (SELECT id FROM feedback_submissions);

-- 4. Delete all feedback submissions
DELETE FROM feedback_submissions;

-- ============================================
-- OPTIONAL: Additional cleanup (uncomment as needed)
-- ============================================

-- Optionally: Reset video statuses back to 'pending' if you want to keep videos but reset their state
-- UPDATE videos SET status = 'pending' WHERE status IN ('ready', 'processing');

-- Optionally: Delete all videos as well (if you want a complete reset)
-- DELETE FROM videos;

-- Optionally: Clear mentor availability slots (keeps mentors but removes their availability)
-- DELETE FROM availability_slots;

-- ============================================
-- Verification queries (run separately to check)
-- ============================================
-- SELECT COUNT(*) as remaining_sessions FROM booked_sessions;
-- SELECT COUNT(*) as remaining_submissions FROM feedback_submissions;
-- SELECT COUNT(*) as remaining_credits FROM session_credits;
-- SELECT COUNT(*) as remaining_payments FROM payments;
