-- Add advanced validation columns to registrations table
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS original_category TEXT,
ADD COLUMN IF NOT EXISTS music_status TEXT DEFAULT 'pending';
