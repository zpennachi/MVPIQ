-- Fix RLS policy for availability slots to allow viewing recurring slots
-- This allows users to see recurring slots even if their original start_time is in the past
-- The application logic will expand recurring slots to show future instances

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Everyone can view active availability slots" ON availability_slots;

-- Create a new policy that allows viewing:
-- 1. Active slots with start_time in the future
-- 2. Active recurring slots (even if start_time is in the past, they generate future instances)
CREATE POLICY "Everyone can view active availability slots"
  ON availability_slots FOR SELECT
  USING (
    is_active = true AND (
      start_time > NOW() OR 
      is_recurring = true
    )
  );
