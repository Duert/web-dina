-- Create Settings Table (Singleton)
CREATE TABLE app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  public_sales_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Initialize default row
INSERT INTO app_settings (id, public_sales_enabled) VALUES (1, FALSE)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read (everyone needs to know if sales are open)
CREATE POLICY "Allow public read settings" ON app_settings FOR SELECT USING (true);

-- Allow public update (protected by client-side admin PIN for this demo)
CREATE POLICY "Allow public update settings" ON app_settings FOR UPDATE USING (true) WITH CHECK (true);
