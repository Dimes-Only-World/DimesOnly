INSERT INTO page_videos (page_key, video_url) VALUES
('home_hero_desktop', 'https://dimesonlyworld.s3.us-east-2.amazonaws.com/16-9+1080+cinema+HOME+banner.webm'),
('home_hero_mobile', 'https://dimesonlyworld.s3.us-east-2.amazonaws.com/9-16+1080+HOME+BANNER.webm'),
('home_fullwidth_desktop', 'https://dimesonlyworld.s3.us-east-2.amazonaws.com/HOME+PAGE+16-9+1080+CINEMA.webm'),
('home_fullwidth_mobile', 'https://dimesonlyworld.s3.us-east-2.amazonaws.com/HOME+PAGE+9-16+1080+FINAL.webm'),
('home_background', 'https://dimesonlyworld.s3.us-east-2.amazonaws.com/Background-Ladies-1.webm')
ON CONFLICT (page_key) DO NOTHING;