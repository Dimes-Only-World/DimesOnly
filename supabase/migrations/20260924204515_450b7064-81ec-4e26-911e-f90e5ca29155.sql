DROP POLICY IF EXISTS "Public read approved captures" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Public read vehicle-media" ON storage.objects;
CREATE POLICY "Admins read vehicle-media" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'vehicle-media' AND public.is_admin());
CREATE POLICY "Admins read product images" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'::app_role));