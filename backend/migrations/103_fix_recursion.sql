-- Fix Infinite Recursion in user_profiles policies
-- The error "infinite recursion detected in policy for relation 'user_profiles'" suggests that 
-- one of the policies is querying 'user_profiles' itself, likely implicitly or via a role check.

-- 1. DROP ALL existing policies on user_profiles to start clean
DROP POLICY IF EXISTS select_own_profile ON public.user_profiles;
DROP POLICY IF EXISTS insert_own_profile ON public.user_profiles;
DROP POLICY IF EXISTS update_own_profile ON public.user_profiles;
DROP POLICY IF EXISTS "select_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "insert_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "update_own_profile" ON public.user_profiles;
-- Also drop potential admin policies that might be causing this
DROP POLICY IF EXISTS admin_all ON public.user_profiles;
DROP POLICY IF EXISTS "admin_all" ON public.user_profiles;

-- 2. RE-CREATE simple, non-recursive policies for basic access
-- These rely ONLY on auth.uid(), which is safe.

-- Select: Users can see their own profile
CREATE POLICY select_own_profile ON public.user_profiles
FOR SELECT USING (auth.uid() = auth_uid);

-- Insert: Users can insert their own profile
CREATE POLICY insert_own_profile ON public.user_profiles
FOR INSERT WITH CHECK (auth.uid() = auth_uid);

-- Update: Users can update their own profile
CREATE POLICY update_own_profile ON public.user_profiles
FOR UPDATE USING (auth.uid() = auth_uid);

-- 3. Allow Public READ of Avatar/Callsign if needed (optional, keeping strict for now)
-- If you need public profiles later, use:
-- CREATE POLICY view_public_profiles ON public.user_profiles FOR SELECT USING (true);

-- 4. Fix potential recursion in 'on_auth_user_updated' trigger if specifically updating user_profiles
-- The trigger 'handle_user_update' updates user_profiles.
-- Ensure RLS is bypassed for triggers using SECURITY DEFINER functions (which we successfully did in 101).
-- However, if 'upsert' from client side triggers it, we are fine.

-- 5. Helper Function for Admin checks (SECURITY DEFINER to avoid recursion)
-- If we ever need to check admin status inside a policy on user_profiles, we must use this.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE auth_uid = auth.uid() 
    AND role_id = 'admin'
  );
$$;

-- 6. Grant admin full access using safe function
CREATE POLICY admin_all_profiles ON public.user_profiles
FOR ALL
USING ( public.is_admin() );
