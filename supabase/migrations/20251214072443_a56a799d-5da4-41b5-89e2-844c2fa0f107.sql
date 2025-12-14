-- Add UPDATE policies for event storage buckets (needed for some upload scenarios)
CREATE POLICY "Allow authenticated users to update event videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'event-videos');

CREATE POLICY "Allow anon to update event videos"
ON storage.objects FOR UPDATE
TO anon
USING (bucket_id = 'event-videos');

CREATE POLICY "Allow authenticated users to update event photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'event-photos');

CREATE POLICY "Allow anon to update event photos"
ON storage.objects FOR UPDATE
TO anon
USING (bucket_id = 'event-photos');

-- Add DELETE policies (for replacing files)
CREATE POLICY "Allow authenticated users to delete event videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'event-videos');

CREATE POLICY "Allow anon to delete event videos"
ON storage.objects FOR DELETE
TO anon
USING (bucket_id = 'event-videos');

CREATE POLICY "Allow authenticated users to delete event photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'event-photos');

CREATE POLICY "Allow anon to delete event photos"
ON storage.objects FOR DELETE
TO anon
USING (bucket_id = 'event-photos');