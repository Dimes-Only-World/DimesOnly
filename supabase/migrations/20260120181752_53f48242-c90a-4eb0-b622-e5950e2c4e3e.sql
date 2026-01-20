-- Create promo-videos bucket for GET A CAR and CLOTHES promo videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('promo-videos', 'promo-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read access for promo videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'promo-videos');

-- Allow authenticated users to upload (admin use)
CREATE POLICY "Authenticated users can upload promo videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'promo-videos');

-- Allow authenticated users to update
CREATE POLICY "Authenticated users can update promo videos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'promo-videos');

-- Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete promo videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'promo-videos');