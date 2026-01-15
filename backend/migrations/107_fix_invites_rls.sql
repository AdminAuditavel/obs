-- Helper Function for Admin checks (SECURITY DEFINER to avoid recursion)
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

-- Ensure Admins can view/manage all invites
DROP POLICY IF EXISTS "Admins can view all invites" ON public.invites;
DROP POLICY IF EXISTS "Admins can insert invites" ON public.invites;
DROP POLICY IF EXISTS "Admins can update invites" ON public.invites;
DROP POLICY IF EXISTS "Admins can delete invites" ON public.invites;

-- Create unified policies using the secure function
CREATE POLICY "Admins can view all invites" ON public.invites
FOR SELECT
USING ( public.is_admin() );

CREATE POLICY "Admins can insert invites" ON public.invites
FOR INSERT
WITH CHECK ( public.is_admin() );

CREATE POLICY "Admins can update invites" ON public.invites
FOR UPDATE
USING ( public.is_admin() );

CREATE POLICY "Admins can delete invites" ON public.invites
FOR DELETE
USING ( public.is_admin() );
