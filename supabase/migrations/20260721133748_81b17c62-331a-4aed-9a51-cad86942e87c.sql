-- Event media: public read remains; direct browser writes are admin-only.
DROP POLICY IF EXISTS "All 1rdror8_0" ON storage.objects;
DROP POLICY IF EXISTS "All 1rdror8_1" ON storage.objects;
DROP POLICY IF EXISTS "All 1rdror8_2" ON storage.objects;
DROP POLICY IF EXISTS "All 1rdror8_3" ON storage.objects;
DROP POLICY IF EXISTS "All 1u8dvqj_0" ON storage.objects;
DROP POLICY IF EXISTS "All 1u8dvqj_1" ON storage.objects;
DROP POLICY IF EXISTS "All 1u8dvqj_2" ON storage.objects;
DROP POLICY IF EXISTS "All 1u8dvqj_3" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon to delete event photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon to delete event videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon to update event photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon to update event videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon uploads to event-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon to upload event videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon uploads to event-videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete event photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete event videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update event photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update event videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload event videos" ON storage.objects;

CREATE POLICY "Admins can upload event photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-photos' AND public.is_admin());

CREATE POLICY "Admins can update event photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'event-photos' AND public.is_admin())
WITH CHECK (bucket_id = 'event-photos' AND public.is_admin());

CREATE POLICY "Admins can delete event photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'event-photos' AND public.is_admin());

CREATE POLICY "Admins can upload event videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-videos' AND public.is_admin());

CREATE POLICY "Admins can update event videos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'event-videos' AND public.is_admin())
WITH CHECK (bucket_id = 'event-videos' AND public.is_admin());

CREATE POLICY "Admins can delete event videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'event-videos' AND public.is_admin());

-- Notification bucket: public read remains; no public writes.
DROP POLICY IF EXISTS "All 9udwq3_1" ON storage.objects;
DROP POLICY IF EXISTS "All 9udwq3_2" ON storage.objects;
DROP POLICY IF EXISTS "All 9udwq3_3" ON storage.objects;

CREATE POLICY "Admins can upload notification files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'notification' AND public.is_admin());

CREATE POLICY "Admins can update notification files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'notification' AND public.is_admin())
WITH CHECK (bucket_id = 'notification' AND public.is_admin());

CREATE POLICY "Admins can delete notification files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'notification' AND public.is_admin());

-- User photos: require authenticated users to write only inside their own folder.
DROP POLICY IF EXISTS "Allow public uploads to user-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to user-photos" ON storage.objects;

CREATE POLICY "Users can upload own user photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'user-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Rental docs: direct uploads require ownership; Edge Function service-role uploads still bypass RLS.
DROP POLICY IF EXISTS "Anyone can upload rental docs" ON storage.objects;

CREATE POLICY "Users can upload own rental docs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'rental-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Full users table should not expose password hashes/contact details to every authenticated user.
DROP POLICY IF EXISTS "Allow authenticated users to view public profile data" ON public.users;