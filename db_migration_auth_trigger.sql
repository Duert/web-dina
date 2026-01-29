-- Trigger to create profile on signup using Raw User Meta Data
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, rep_email, school_name, rep_name, rep_surnames, rep_phone)
  VALUES (
    new.id, 
    new.email,
    COALESCE(new.raw_user_meta_data->>'school_name', ''),
    COALESCE(new.raw_user_meta_data->>'rep_name', ''),
    COALESCE(new.raw_user_meta_data->>'rep_surnames', ''),
    COALESCE(new.raw_user_meta_data->>'rep_phone', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop generic trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create Trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
