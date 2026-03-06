
-- Ensure private-media bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('private-media', 'private-media', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files to private-media
CREATE POLICY "Authenticated users can upload to private-media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'private-media');

-- Allow authenticated users to read their own files from private-media
CREATE POLICY "Authenticated users can read own files from private-media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'private-media');

-- Allow authenticated users to delete their own files from private-media
CREATE POLICY "Authenticated users can delete own files from private-media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'private-media');

-- Allow service role full access (for edge functions)
CREATE POLICY "Service role full access to private-media"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'private-media')
WITH CHECK (bucket_id = 'private-media');
