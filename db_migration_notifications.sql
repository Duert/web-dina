-- Add is_read column to registration_messages
ALTER TABLE public.registration_messages 
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- Mark all existing messages sent by ADMIN as read (since they are outgoing)
UPDATE public.registration_messages 
SET is_read = TRUE 
WHERE sender_role = 'admin';

-- Optional: Mark old user messages as read if desired, but let's keep them unread so admin sees "new" things if they missed them.
