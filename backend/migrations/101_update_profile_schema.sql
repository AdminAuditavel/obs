-- 1. Create 'avatars' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Add columns to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS avatar_url text;

-- 3. Backfill email from auth.users (Need permission, usually works in migration tool context)
-- Note: Accessing auth.users directly might require special privileges.
UPDATE user_profiles
SET email = auth.users.email
FROM auth.users
WHERE user_profiles.auth_uid = auth.users.id;

-- 4. Constraint (optional, but good for integrity)
-- ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_email_unique UNIQUE (email);
-- Only add unique constraint if we are sure backfill worked, otherwise might fail on nulls.
-- Let's stick to unique index on non-nulls or just simple unique.

-- 5. Create Auto-Sync Function
CREATE OR REPLACE FUNCTION public.handle_user_update() 
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.user_profiles
  SET email = NEW.email
  WHERE auth_uid = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger for Update
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
AFTER UPDATE ON auth.users
FOR EACH ROW
WHEN (OLD.email IS DISTINCT FROM NEW.email)
EXECUTE PROCEDURE public.handle_user_update();

-- 7. Update the existing 'handle_new_user' trigger logic (if you used one) or create a new one to populate profile
-- Assuming you rely on manual insertion in app/edge functions for now as per `acceptInvite` logic.
-- BUT, typically Supabase recommends a trigger for reliability.
-- Let's ensuring we have policies for the bucket.

-- Storage Policies
CREATE POLICY "Avatar Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

CREATE POLICY "Avatar Upload User"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

CREATE POLICY "Avatar Update Own"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'avatars' AND auth.uid() = owner )
WITH CHECK ( bucket_id = 'avatars' AND auth.uid() = owner );

CREATE POLICY "Avatar Delete Own"
ON storage.objects FOR DELETE
USING ( bucket_id = 'avatars' AND auth.uid() = owner );
