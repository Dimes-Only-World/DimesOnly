-- Events: public read stays; direct public writes are removed.
DROP POLICY IF EXISTS "Allow event creation" ON public.events;
DROP POLICY IF EXISTS "Allow event updates" ON public.events;
DROP POLICY IF EXISTS "Allow event deletion" ON public.events;

-- Private media: remove broad bucket-only policies and replace with path ownership/admin checks.
DROP POLICY IF EXISTS "Authenticated users can read own files from private-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own files from private-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to private-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can view videos based on membership tier" ON storage.objects;
DROP POLICY IF EXISTS "all 1r7zrx6_0" ON storage.objects;
DROP POLICY IF EXISTS "all 1r7zrx6_1" ON storage.objects;
DROP POLICY IF EXISTS "all 1r7zrx6_2" ON storage.objects;
DROP POLICY IF EXISTS "all 1r7zrx6_3" ON storage.objects;

CREATE POLICY "Users can read own private media"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'private-media' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));

CREATE POLICY "Users can upload own private media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'private-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own private media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'private-media' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()))
WITH CHECK (bucket_id = 'private-media' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));

CREATE POLICY "Users can delete own private media"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'private-media' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));

-- Preserve owner-scoped uploads to public-media after replacing the broad combined upload policy.
CREATE POLICY "Users can upload own public media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'public-media' AND (storage.foldername(name))[1] = auth.uid()::text);