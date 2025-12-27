-- Allow authenticated users to view user media from any user
-- This enables users to see videos/photos uploaded by performers
CREATE POLICY "Allow authenticated users to view user media"
ON public.user_media
FOR SELECT
TO authenticated
USING (true);