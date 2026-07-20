
-- vehicle-media: public read, admin write
CREATE POLICY "Public read vehicle-media" ON storage.objects
  FOR SELECT USING (bucket_id = 'vehicle-media');
CREATE POLICY "Admins write vehicle-media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'vehicle-media' AND public.is_admin());
CREATE POLICY "Admins update vehicle-media" ON storage.objects
  FOR UPDATE USING (bucket_id = 'vehicle-media' AND public.is_admin());
CREATE POLICY "Admins delete vehicle-media" ON storage.objects
  FOR DELETE USING (bucket_id = 'vehicle-media' AND public.is_admin());

-- rental-documents: user uploads own docs (path prefix = auth.uid()), owner + admin read
CREATE POLICY "Users upload own rental docs" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'rental-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Owner or admin read rental docs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'rental-documents'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin())
  );
CREATE POLICY "Admins manage rental docs" ON storage.objects
  FOR DELETE USING (bucket_id = 'rental-documents' AND public.is_admin());
