-- FIX CHAT RLS POLICIES

-- 1. Ensure users can SELECT their own registrations (Critical for the subquery check)
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own registrations" ON public.registrations;
CREATE POLICY "Users can view own registrations"
ON public.registrations FOR SELECT
USING (auth.uid() = user_id);

-- 2. Fix Registration Messages Policies

-- Drop existing to start clean
DROP POLICY IF EXISTS "Users can view messages for their own registrations" ON public.registration_messages;
DROP POLICY IF EXISTS "Users can insert messages for their own registrations" ON public.registration_messages;
DROP POLICY IF EXISTS "Service role can do everything on messages" ON public.registration_messages;

-- Re-apply correct policies

-- Allow users to SELECT messages if they own the registration
CREATE POLICY "Users can view messages for their own registrations"
ON public.registration_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.registrations
        WHERE public.registrations.id = public.registration_messages.registration_id
        AND public.registrations.user_id = auth.uid()
    )
);

-- Allow users to INSERT messages if they own the registration (good practice even if using Server Action)
CREATE POLICY "Users can insert messages for their own registrations"
ON public.registration_messages FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.registrations
        WHERE public.registrations.id = public.registration_messages.registration_id
        AND public.registrations.user_id = auth.uid()
    )
    AND sender_role = 'user'
);

-- Service Role / Admin Policy
CREATE POLICY "Service role can do everything on messages"
ON public.registration_messages FOR ALL
USING (true)
WITH CHECK (true);
