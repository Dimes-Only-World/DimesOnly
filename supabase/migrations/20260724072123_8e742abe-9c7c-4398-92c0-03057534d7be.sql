
-- feed-photos: user can upload/manage files under their own uid folder; anyone authenticated can view
CREATE POLICY "feed_photos_read_auth" ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'feed-photos');

CREATE POLICY "feed_photos_write_own" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'feed-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "feed_photos_delete_own" ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'feed-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- feed-videos: same
CREATE POLICY "feed_videos_read_auth" ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'feed-videos');

CREATE POLICY "feed_videos_write_own" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'feed-videos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "feed_videos_delete_own" ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'feed-videos' AND (storage.foldername(name))[1] = auth.uid()::text);
