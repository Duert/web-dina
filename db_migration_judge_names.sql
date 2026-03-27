-- Add judge_names column to app_settings if it doesn't exist
ALTER TABLE public.app_settings 
ADD COLUMN IF NOT EXISTS judge_names JSONB DEFAULT '{"1": "Juez 1", "2": "Juez 2", "3": "Juez 3", "4": "Juez 4"}';

-- Update the existing row if it exists, setting default if null
UPDATE public.app_settings 
SET judge_names = '{"1": "Juez 1", "2": "Juez 2", "3": "Juez 3", "4": "Juez 4"}'
WHERE id = 1 AND judge_names IS NULL;
