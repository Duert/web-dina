-- Make approval default to TRUE (Auto-Approve)
ALTER TABLE profiles ALTER COLUMN is_approved SET DEFAULT TRUE;

-- Retroactively approve everyone
UPDATE profiles SET is_approved = TRUE;
