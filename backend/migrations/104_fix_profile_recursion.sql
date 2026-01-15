-- Migration: 104_fix_profile_recursion.sql
-- Fixes "infinite recursion detected" by removing self-referencing RLS policies on user_profiles

-- 1. Drop ALL existing policies on user_profiles that might be recursive
DROP POLICY IF EXISTS "select_admins_or_own" ON public.user_profiles;
DROP POLICY IF EXISTS "update_admins_or_own" ON public.user_profiles;
DROP POLICY IF EXISTS "insert_admins_or_own" ON public.user_profiles;
DROP POLICY IF EXISTS "delete_only_admins" ON public.user_profiles;
DROP POLICY IF EXISTS "admin_all_profiles" ON public.user_profiles;

-- Also drop the simple ones effectively to ensure a clean slate, then recreate
DROP POLICY IF EXISTS "select_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "insert_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "update_own_profile" ON public.user_profiles;

-- 2. Create Helper Function for Admin checks (SECURITY DEFINER)
-- This bypasses RLS on user_profiles to check admin status safely
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE auth_uid = auth.uid() 
    AND role_id = 'admin'
  );
$$;

-- 3. Re-create simple, non-recursive policies for basic User access
-- These rely ONLY on auth.uid() which is available in the session, no table lookups needed.

-- SELECT: Users can see their own profile
CREATE POLICY "select_own_profile" ON public.user_profiles
FOR SELECT USING (auth.uid() = auth_uid);

-- UPDATE: Users can update their own profile
CREATE POLICY "update_own_profile" ON public.user_profiles
FOR UPDATE USING (auth.uid() = auth_uid);

-- INSERT: Users can insert their own profile
CREATE POLICY "insert_own_profile" ON public.user_profiles
FOR INSERT WITH CHECK (auth.uid() = auth_uid);

-- 4. Re-create Admin policies using the SAFE function
-- This allows admins to see/edit ALL profiles without triggering recursion
CREATE POLICY "admin_all_profiles" ON public.user_profiles
FOR ALL
USING ( public.is_admin() );
