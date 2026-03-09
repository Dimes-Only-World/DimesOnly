
CREATE TABLE public.page_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text UNIQUE NOT NULL,
  video_url text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.page_videos ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "public_read_page_videos" ON public.page_videos FOR SELECT TO public USING (true);

-- Anon can write (admin uses sessionStorage auth, not Supabase Auth)
CREATE POLICY "anon_write_page_videos" ON public.page_videos FOR ALL TO anon USING (true) WITH CHECK (true);

-- Service role full access
CREATE POLICY "service_write_page_videos" ON public.page_videos FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Seed the 7 page keys
INSERT INTO public.page_videos (page_key) VALUES
  ('dashboard_male'),
  ('dashboard_dimes'),
  ('tip_win_page'),
  ('rate_page'),
  ('dimes_directory_page'),
  ('events_male_page'),
  ('events_dimes_page');
