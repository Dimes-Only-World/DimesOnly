-- Allow authenticated users to view public profile data from any user
-- This enables users to see profile photos, banners, usernames, etc. of other users
CREATE POLICY "Allow authenticated users to view public profile data"
ON public.users
FOR SELECT
TO authenticated
USING (true);