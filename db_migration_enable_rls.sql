-- Enable RLS on tables flagged by Supabase Linter

-- 1. Enable RLS on 'seats' table
ALTER TABLE public.seats ENABLE ROW LEVEL SECURITY;

-- 2. Enable RLS on 'sessions' table
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- 3. Enable RLS on 'tickets' table
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- 4. Double check policies exist (idempotent due to existing policies mentioned in error)
-- If policies are missing, they should be added here, but the error says "Policy Exists RLS Disabled", so we just need to enable RLS.
