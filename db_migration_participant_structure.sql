-- Add structured file columns to registration_participants
ALTER TABLE registration_participants 
ADD COLUMN IF NOT EXISTS authorization_urls TEXT[],
ADD COLUMN IF NOT EXISTS dni_urls TEXT[],
ADD COLUMN IF NOT EXISTS authorized_dni_urls TEXT[];
