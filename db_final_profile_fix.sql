-- FINAL PROFILE FIX (REALLY FINAL)

-- 1. Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop any potentially conflicting policies
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Allow public read profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON profiles;

-- 3. Create a single comprehensive policy for the owner
-- This allows SELECT, INSERT, UPDATE, DELETE if the ID matches the user's ID.
CREATE POLICY "Users can manage own profile" ON profiles
FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. Allow public read (so admin can see them, and for general access if needed)
CREATE POLICY "Allow public read profiles" ON profiles
FOR SELECT
USING (true);

-- 5. Ensure columns exist (just to be 100% sure)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS school_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rep_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rep_surnames TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
