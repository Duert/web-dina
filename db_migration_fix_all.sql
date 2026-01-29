-- Comprehensive Fix Migration

-- 1. Add music_file_url to registrations (Missing)
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS music_file_url TEXT;

-- 2. Add dni_urls array to to registration_responsibles (New requirement)
ALTER TABLE registration_responsibles 
ADD COLUMN IF NOT EXISTS dni_urls TEXT[];

-- 3. Ensure payment_proof_urls exists (Just in case)
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS payment_proof_urls TEXT[];

-- 4. Ensure notes exists
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 5. Ensure participants have dni_url
ALTER TABLE registration_participants 
ADD COLUMN IF NOT EXISTS dni_url TEXT;
