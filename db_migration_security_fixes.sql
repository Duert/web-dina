-- Fix 1: Enable RLS on tables that have policies but RLS is disabled
ALTER TABLE public.seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Fix 2: Set search_path for potentially vulnerable function
-- Note: Replace 'handle_new_user' with the actual function signature if needed
-- Assuming user provided name: handle_new_user
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- Verify RLS status (Optional, for manual check)
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
