-- FINAL COMPREHENSIVE FIX

-- 1. FIX MISSING COLUMNS
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS music_file_url TEXT;

ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS payment_proof_urls TEXT[];

ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE registration_responsibles 
ADD COLUMN IF NOT EXISTS dni_urls TEXT[];

ALTER TABLE registration_participants 
ADD COLUMN IF NOT EXISTS dni_url TEXT;


-- 2. FIX PROFILE EDITING PERMISSIONS (RLS)
-- Enable RLS on profiles to be safe
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to UPDATE their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- Allow public read (assuming admin needs it)
DROP POLICY IF EXISTS "Allow public read profiles" ON profiles;
CREATE POLICY "Allow public read profiles" ON profiles
FOR SELECT USING (true);

-- Ensure columns exist in profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS school_name TEXT;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS rep_name TEXT;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS rep_surnames TEXT;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone TEXT;
