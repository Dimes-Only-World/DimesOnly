DROP POLICY IF EXISTS "Users upload own rental docs" ON storage.objects;

CREATE POLICY "Anyone can upload rental docs"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'rental-documents');
