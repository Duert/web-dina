CREATE TABLE IF NOT EXISTS escaletas (
  category TEXT PRIMARY KEY,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE escaletas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read escaletas" ON escaletas FOR SELECT USING (true);
CREATE POLICY "Allow public insert escaletas" ON escaletas FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update escaletas" ON escaletas FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete escaletas" ON escaletas FOR DELETE USING (true);
