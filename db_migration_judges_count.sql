-- Add judges_count column to app_settings
ALTER TABLE public.app_settings 
ADD COLUMN IF NOT EXISTS judges_count INTEGER DEFAULT 4;

-- Update the existing row to ensure it has a value
UPDATE public.app_settings 
SET judges_count = 4 
WHERE id = 1 AND judges_count IS NULL;
