-- Add dni_urls column (array of text) to registration_responsibles
ALTER TABLE registration_responsibles 
ADD COLUMN IF NOT EXISTS dni_urls TEXT[];

-- Optional: Migrate existing dni_url to dni_urls if needed, then drop dni_url
-- UPDATE registration_responsibles SET dni_urls = ARRAY[dni_url] WHERE dni_url IS NOT NULL AND dni_urls IS NULL;
-- ALTER TABLE registration_responsibles DROP COLUMN dni_url;
