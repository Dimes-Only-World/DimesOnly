-- Add policy to allow authenticated users to view silver tier content
CREATE POLICY "authenticated_silver_previews"
ON public.user_media
FOR SELECT
TO authenticated
USING (content_tier = 'silver');