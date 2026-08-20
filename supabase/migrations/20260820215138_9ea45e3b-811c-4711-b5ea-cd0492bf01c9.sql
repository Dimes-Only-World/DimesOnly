
CREATE POLICY "Event photos insert anon or auth" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'event-photos');
CREATE POLICY "Event videos insert anon or auth" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'event-videos');
CREATE POLICY "Event photos update anon or auth" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'event-photos') WITH CHECK (bucket_id = 'event-photos');
CREATE POLICY "Event videos update anon or auth" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'event-videos') WITH CHECK (bucket_id = 'event-videos');
