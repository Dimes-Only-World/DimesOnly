CREATE TABLE public.page_video_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text NOT NULL,
  video_url text NOT NULL,
  replaced_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.page_video_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_video_history" ON public.page_video_history
  FOR SELECT TO public USING (true);

CREATE POLICY "anon_write_video_history" ON public.page_video_history
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "service_write_video_history" ON public.page_video_history
  FOR ALL TO service_role USING (true) WITH CHECK (true);