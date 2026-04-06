-- Track user interactions for rankings and potentially other pages
CREATE TABLE IF NOT EXISTS page_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'page_view', 'category_selection', 'group_expansion'
    page_path TEXT NOT NULL, -- e.g., '/rankings'
    category TEXT,
    group_name TEXT,
    block TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for faster analytics queries
CREATE INDEX IF NOT EXISTS idx_interactions_event_type ON page_interactions(event_type);
CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON page_interactions(created_at);
CREATE INDEX IF NOT EXISTS idx_interactions_session_id ON page_interactions(session_id);

-- Enable RLS
ALTER TABLE page_interactions ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (since it's tracking public interactions)
DROP POLICY IF EXISTS "Public insert interactions" ON page_interactions;
CREATE POLICY "Public insert interactions" ON page_interactions FOR INSERT WITH CHECK (true);

-- Allow admins to read all interactions (service role will handle this in actions)
DROP POLICY IF EXISTS "Admin read interactions" ON page_interactions;
CREATE POLICY "Admin read interactions" ON page_interactions FOR SELECT USING (true);
