-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow public read access to profiles (so admin can fetch them)
-- In a real production app with auth tiers, this would be restricted to admin only,
-- but for this MVP structure where admin entry is pin-based on client, we allow public read.
DROP POLICY IF EXISTS "Allow public read profiles" ON profiles;
CREATE POLICY "Allow public read profiles" ON profiles FOR SELECT USING (true);
