-- Add group_registration_enabled column to app_settings
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS group_registration_enabled BOOLEAN DEFAULT FALSE;

-- Update the default row (id=1) to ensure it's initialized (although default handles new rows)
UPDATE app_settings SET group_registration_enabled = FALSE WHERE id = 1;
