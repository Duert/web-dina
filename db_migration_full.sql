-- Add notes column to registrations
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add payment_proof_urls column (array of text) to replace single url
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS payment_proof_urls TEXT[];

-- Migrate existing payment_proof_url to the new array column if needed
-- UPDATE registrations SET payment_proof_urls = ARRAY[payment_proof_url] WHERE payment_proof_url IS NOT NULL AND payment_proof_urls IS NULL;

-- Add dni_url to registration_responsibles
ALTER TABLE registration_responsibles 
ADD COLUMN IF NOT EXISTS dni_url TEXT;

-- Add dni_url to registration_participants
ALTER TABLE registration_participants 
ADD COLUMN IF NOT EXISTS dni_url TEXT;
