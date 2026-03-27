-- Create registration_messages table
CREATE TABLE IF NOT EXISTS public.registration_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('admin', 'user')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.registration_messages ENABLE ROW LEVEL SECURITY;

-- Policy for Public/Anon (Users)
CREATE POLICY "Users can view messages for their own registrations"
ON public.registration_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.registrations
        WHERE public.registrations.id = public.registration_messages.registration_id
        AND public.registrations.user_id = auth.uid()
    )
);

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

-- Policy for Service Role (Admin) - Allow everything
CREATE POLICY "Service role can do everything on messages"
ON public.registration_messages FOR ALL
USING (true)
WITH CHECK (true);

-- Grant access
GRANT ALL ON public.registration_messages TO service_role;
GRANT SELECT, INSERT ON public.registration_messages TO authenticated;
GRANT SELECT, INSERT ON public.registration_messages TO anon;
