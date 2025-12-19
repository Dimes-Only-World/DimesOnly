-- Allow users to see other users who were referred by them
CREATE POLICY "users_select_referrals" ON public.users
FOR SELECT
USING (
  referred_by = (
    SELECT username FROM public.users WHERE id = auth.uid()
  )
);