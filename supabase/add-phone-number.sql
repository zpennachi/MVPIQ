-- Add phone_number column to profiles table
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS phone_number TEXT;
