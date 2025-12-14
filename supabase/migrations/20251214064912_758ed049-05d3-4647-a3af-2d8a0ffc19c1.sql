-- Add anon upload policy for event-photos bucket
CREATE POLICY "Allow anon uploads to event-photos"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'event-photos');

-- Add anon read policy for event-photos bucket  
CREATE POLICY "Allow anon read from event-photos"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'event-photos');

-- Add anon upload policy for event-videos bucket
CREATE POLICY "Allow anon uploads to event-videos"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'event-videos');

-- Add anon read policy for event-videos bucket
CREATE POLICY "Allow anon read from event-videos"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'event-videos');