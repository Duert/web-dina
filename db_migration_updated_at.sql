-- Add updated_at column to registrations table
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Optional: Update existing rows to have updated_at = created_at if it's null (though default handles new ones)
UPDATE registrations SET updated_at = created_at WHERE updated_at IS NULL;
