-- FULL DATABASE SETUP (Safe to run multiple times)

-- 1. App Settings (for Sales Toggle)
CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  public_sales_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO app_settings (id, public_sales_enabled) VALUES (1, FALSE)
ON CONFLICT (id) DO NOTHING;

-- 2. Registration Tables
CREATE TABLE IF NOT EXISTS registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_name TEXT NOT NULL,
  category TEXT NOT NULL,
  payment_proof_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS registration_responsibles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID REFERENCES registrations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  surnames TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS registration_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID REFERENCES registrations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  surnames TEXT NOT NULL,
  dob DATE NOT NULL,
  num_tickets INTEGER DEFAULT 0 NOT NULL,
  authorization_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_responsibles ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_participants ENABLE ROW LEVEL SECURITY;

-- 4. Clean & Re-create Policies (To avoid errors and ensure consistency)

-- App Settings Policies
DROP POLICY IF EXISTS "Public Read Settings" ON app_settings;
DROP POLICY IF EXISTS "Public Update Settings" ON app_settings;

CREATE POLICY "Public Read Settings" ON app_settings FOR SELECT USING (true);
CREATE POLICY "Public Update Settings" ON app_settings FOR UPDATE USING (true) WITH CHECK (true);

-- Registrations Policies
DROP POLICY IF EXISTS "Allow public insert registrations" ON registrations;
DROP POLICY IF EXISTS "Allow public read registrations" ON registrations;

CREATE POLICY "Allow public insert registrations" ON registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read registrations" ON registrations FOR SELECT USING (true);

-- Responsibles Policies
DROP POLICY IF EXISTS "Allow public insert responsibles" ON registration_responsibles;
DROP POLICY IF EXISTS "Allow public read responsibles" ON registration_responsibles;

CREATE POLICY "Allow public insert responsibles" ON registration_responsibles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read responsibles" ON registration_responsibles FOR SELECT USING (true);

-- Participants Policies
DROP POLICY IF EXISTS "Allow public insert participants" ON registration_participants;
DROP POLICY IF EXISTS "Allow public read participants" ON registration_participants;

CREATE POLICY "Allow public insert participants" ON registration_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read participants" ON registration_participants FOR SELECT USING (true);

-- 5. Storage (Uploads Bucket) - Try to insert, ignore if exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('uploads', 'uploads', true) 
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DROP POLICY IF EXISTS "Public Access Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert Uploads" ON storage.objects;

CREATE POLICY "Public Access Uploads" ON storage.objects FOR SELECT USING ( bucket_id = 'uploads' );
CREATE POLICY "Public Insert Uploads" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'uploads' );
