-- Add RLS policies for event-videos bucket to allow uploads
CREATE POLICY "Allow authenticated users to upload event videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-videos');

CREATE POLICY "Allow anon to upload event videos"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'event-videos');

CREATE POLICY "Allow public read access to event videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'event-videos');

-- Also ensure event-photos has proper policies
CREATE POLICY "Allow public read access to event photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'event-photos');