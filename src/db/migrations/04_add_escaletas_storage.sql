-- Add column for storing category image maps if it doesn't exist
ALTER TABLE app_settings 
ADD COLUMN IF NOT EXISTS escaletas_images JSONB DEFAULT '{}'::jsonb;

-- Create escaletas storage bucket if it doesn't exist.
-- Note: Supabase Postgres doesn't easily create buckets via raw SQL without specific RPCs.
-- Usually buckets are managed via Dashboard. 
-- For safety, we will create the bucket if possible, otherwise we rely on the `judges` bucket if needed, but a dedicated one is better.
-- The user will likely need to create the 'escaletas' bucket manually in Supabase if this fails, or we can use the 'judges' bucket subfolder.
-- Given previous scripts, let's try to insert into storage schema if it exists, but typically this is blocked by RLS or requires Superuser.
-- Let's just create the column for now, and handle the bucket via JS API if it's missing, or just use the existing 'judges' bucket as a workaround to assure it works.
