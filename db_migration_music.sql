-- Add music_file_url column to registrations table
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS music_file_url TEXT;

-- (Optional) If we wanted to restrict music uploads to a specific bucket path, we could do it in policies, 
-- but the existing 'uploads' bucket policy covers it.
