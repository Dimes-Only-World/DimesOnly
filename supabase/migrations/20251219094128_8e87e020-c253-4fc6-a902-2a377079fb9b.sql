-- Drop the problematic policy completely and recreate it correctly
DROP POLICY IF EXISTS "users_select_referrals" ON public.users;

-- Recreate the policy using the security definer function 
CREATE POLICY "users_select_referrals" ON public.users
FOR SELECT
USING (
  referred_by = public.get_my_username()
);