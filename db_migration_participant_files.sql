-- Add file_urls column to registration_participants table
ALTER TABLE registration_participants 
ADD COLUMN IF NOT EXISTS file_urls TEXT[];

-- Migrate existing separate columns to the new array for backward compatibility support
-- (Optional/Safe update: only if array is null)
UPDATE registration_participants
SET file_urls = ARRAY_REMOVE(ARRAY[dni_url, tutor_dni_url, authorization_url], NULL)
WHERE file_urls IS NULL;
