-- Add tutor_dni_url to registration_participants
ALTER TABLE registration_participants 
ADD COLUMN IF NOT EXISTS tutor_dni_url TEXT; 
