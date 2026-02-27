-- Clear all scheduled appointments/sessions
-- This will delete all booked sessions from the database
-- Use with caution - this cannot be undone!

-- Delete all booked sessions
DELETE FROM booked_sessions;

-- Optional: If you also want to clear all availability slots (mentor availability)
-- Uncomment the line below:
-- DELETE FROM availability_slots;

-- Verify the deletion
SELECT COUNT(*) as remaining_sessions FROM booked_sessions;
-- Should return 0
