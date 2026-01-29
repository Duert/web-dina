-- Backfill missing profiles for existing auth.users
INSERT INTO public.profiles (id, rep_email, school_name, rep_name, rep_surnames, rep_phone)
SELECT 
    id, 
    email, 
    'Escuela Sin Nombre', -- Placeholder
    'Nombre', 
    'Apellidos', 
    ''
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
