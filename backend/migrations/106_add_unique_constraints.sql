-- 106_add_unique_constraints.sql

-- Ensure phone numbers are unique in user_profiles to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_phone_unique 
ON public.user_profiles (phone) 
WHERE phone IS NOT NULL;

-- Ensure emails are unique in user_profiles (redundant with auth.users but good for integrity)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_email_unique 
ON public.user_profiles (email) 
WHERE email IS NOT NULL;
