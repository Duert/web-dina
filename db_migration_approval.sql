-- Add is_approved column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;

-- Mark all existing profiles as approved (retrocompatibility)
UPDATE profiles 
SET is_approved = TRUE 
WHERE is_approved IS FALSE;
