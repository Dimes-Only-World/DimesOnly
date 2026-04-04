INSERT INTO public.page_videos (page_key, video_url) VALUES
  ('register_male', 'https://www.w3schools.com/html/mov_bbb.mp4'),
  ('register_female_normal', 'https://www.w3schools.com/html/mov_bbb.mp4'),
  ('register_female_exotic', 'https://www.w3schools.com/html/mov_bbb.mp4'),
  ('register_female_stripper', 'https://www.w3schools.com/html/mov_bbb.mp4')
ON CONFLICT (page_key) DO NOTHING;