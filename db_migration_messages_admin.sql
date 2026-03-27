-- Allow Admins to View/Insert all messages
-- Since we don't have a reliable 'role' column on the user, we check specific emails or just allow broad access for the 'admin' app logic if possible.
-- BUT for client-side, we must rely on auth.jwt()

CREATE POLICY "Admins can do everything"
ON public.registration_messages
FOR ALL
USING (
    auth.jwt() ->> 'email' IN (
        'domingojosesanchezdominguez@gmail.com', 
        'tudina4@gmail.com',
        'info@tudina.com'
    )
)
WITH CHECK (
    auth.jwt() ->> 'email' IN (
        'domingojosesanchezdominguez@gmail.com', 
        'tudina4@gmail.com',
        'info@tudina.com'
    )
);
