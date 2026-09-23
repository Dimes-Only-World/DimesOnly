CREATE TABLE public.dashboard_ad_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_id UUID NOT NULL REFERENCES public.dashboard_ads(id) ON DELETE CASCADE,
  user_id UUID,
  username TEXT,
  link_url TEXT,
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_dashboard_ad_clicks_ad_time ON public.dashboard_ad_clicks (ad_id, clicked_at DESC);

GRANT INSERT ON public.dashboard_ad_clicks TO anon;
GRANT INSERT ON public.dashboard_ad_clicks TO authenticated;
GRANT ALL ON public.dashboard_ad_clicks TO service_role;

ALTER TABLE public.dashboard_ad_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record an ad click"
  ON public.dashboard_ad_clicks FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Service role manages ad clicks"
  ON public.dashboard_ad_clicks FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);