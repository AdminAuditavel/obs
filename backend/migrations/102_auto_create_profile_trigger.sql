-- Trigger function to create profile on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (auth_uid, full_name, email, role_id)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Novo Usuário'),
    NEW.email,
    'registered'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE PROCEDURE public.handle_new_user();

-- Backfill missing profiles for existing users who might have slipped through
INSERT INTO public.user_profiles (auth_uid, full_name, role_id, email)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'full_name', 'Usuário Recuperado'), 
  'registered',
  email
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles WHERE auth_uid = auth.users.id
);
