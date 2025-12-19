-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "users_select_referrals" ON public.users;

-- Create a security definer function to get the current user's username
CREATE OR REPLACE FUNCTION public.get_my_username()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT username FROM public.users WHERE id = auth.uid()
$$;

-- Recreate the policy using the security definer function (no recursion)
CREATE POLICY "users_select_referrals" ON public.users
FOR SELECT
USING (
  referred_by = public.get_my_username()
);