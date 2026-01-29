
-- Add explicit foreign key from registrations.user_id to profiles.id
-- This allows Supabase to detect the relationship for joins like 'profiles!registrations_user_id_fkey' or just 'profiles' if unambiguous.
ALTER TABLE registrations
ADD CONSTRAINT registrations_user_id_fkey_profiles
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- Also ensure RLS policies allow reading linked profiles if needed (though we use service role in admin)
