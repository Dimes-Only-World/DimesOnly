CREATE POLICY "Users can upload their own membership ID files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'membership-ids' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read their own membership ID files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'membership-ids'
  AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Users can update their own membership ID files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'membership-ids' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'membership-ids' AND (storage.foldername(name))[1] = auth.uid()::text);
