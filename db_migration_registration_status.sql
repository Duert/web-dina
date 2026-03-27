-- Add status tracking columns to registrations table
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS is_confirmed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_verified BOOLEAN DEFAULT FALSE;
