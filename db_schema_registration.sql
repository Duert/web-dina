-- Create Registrations Table
CREATE TABLE registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_name TEXT NOT NULL,
  category TEXT NOT NULL,
  payment_proof_url TEXT, -- [NEW] URL for payment proof
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Responsibles Table
CREATE TABLE registration_responsibles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID REFERENCES registrations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  surnames TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Participants Table
CREATE TABLE registration_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID REFERENCES registrations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  surnames TEXT NOT NULL,
  dob DATE NOT NULL,
  num_tickets INTEGER DEFAULT 0 NOT NULL,
  authorization_url TEXT, -- [NEW] URL for signed authorization
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Row Level Security) - Optional but recommended
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_responsibles ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_participants ENABLE ROW LEVEL SECURITY;

-- Allow public insert (since anyone can register)
CREATE POLICY "Allow public insert registrations" ON registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert responsibles" ON registration_responsibles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert participants" ON registration_participants FOR INSERT WITH CHECK (true);

-- Allow public read registrations (needed for returning data after insert)
CREATE POLICY "Allow public read registrations" ON registrations FOR SELECT USING (true);


-- STORAGE BUCKET SETUP (Run this in SQL Editor)
-- 1. Create a bucket named 'uploads' in Supabase dashboard or via SQL if enabled
insert into storage.buckets (id, name, public) values ('uploads', 'uploads', true);

-- 2. Storage Policies
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'uploads' );

create policy "Public Upload"
  on storage.objects for insert
  with check ( bucket_id = 'uploads' );
