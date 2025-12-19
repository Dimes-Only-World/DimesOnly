-- Add RLS policy to allow all users to view free tier media
CREATE POLICY "Anyone can view free tier media"
ON public.user_media
FOR SELECT
USING (content_tier = 'free');

-- Also allow authenticated users to view all public media (non-restricted)
CREATE POLICY "Authenticated users can view public media"
ON public.user_media
FOR SELECT
TO authenticated
USING (access_restricted = false);

-- Allow service role full access to user_media
CREATE POLICY "Service role full access on user_media"
ON public.user_media
FOR ALL
USING (auth.role() = 'service_role');

-- Add a policy to allow anon users to view non-restricted media
CREATE POLICY "Anon can view non-restricted media"
ON public.user_media
FOR SELECT
TO anon
USING (access_restricted = false);