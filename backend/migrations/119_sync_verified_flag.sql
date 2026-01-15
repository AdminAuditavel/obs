-- 119_sync_verified_flag.sql

-- 1. Ensure 'verified' column exists (safe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'verified') THEN
        ALTER TABLE public.user_profiles ADD COLUMN verified BOOLEAN DEFAULT FALSE;
    END IF;
END
$$;

-- 2. Update existing profiles based on auth.users (Backfill)
UPDATE public.user_profiles
SET verified = TRUE
FROM auth.users
WHERE public.user_profiles.auth_uid = auth.users.id
AND auth.users.email_confirmed_at IS NOT NULL
AND public.user_profiles.verified = FALSE;

-- 3. Function to sync verification status on User Update
CREATE OR REPLACE FUNCTION public.handle_user_verification_update() 
RETURNS TRIGGER AS $$
BEGIN
  -- If email was confirmed just now
  IF NEW.email_confirmed_at IS NOT NULL AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at != NEW.email_confirmed_at) THEN
    UPDATE public.user_profiles
    SET verified = TRUE
    WHERE auth_uid = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger on auth.users Update
DROP TRIGGER IF EXISTS on_auth_user_verification_update ON auth.users;
CREATE TRIGGER on_auth_user_verification_update
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
EXECUTE PROCEDURE public.handle_user_verification_update();

-- 5. Update the INSERT trigger (handle_new_user)
-- We need to redefine the existing function to include the check
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (auth_uid, full_name, email, role_id, verified)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Novo Usuário'),
    NEW.email,
    'registered',
    (NEW.email_confirmed_at IS NOT NULL) -- Set verified if pending invite/confirmed
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
