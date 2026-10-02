CREATE TABLE public.dashboard_ad_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id uuid NOT NULL REFERENCES public.dashboard_ads(id) ON DELETE CASCADE,
  slot_number integer,
  user_id uuid,
  viewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.dashboard_ad_impressions (ad_id, viewed_at);
GRANT INSERT ON public.dashboard_ad_impressions TO anon, authenticated;
GRANT ALL ON public.dashboard_ad_impressions TO service_role;
ALTER TABLE public.dashboard_ad_impressions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Record own or anonymous ad impressions" ON public.dashboard_ad_impressions
  FOR INSERT TO anon, authenticated
  WITH CHECK (((auth.uid() IS NULL AND user_id IS NULL) OR (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid())))
    AND EXISTS (SELECT 1 FROM public.dashboard_ads a WHERE a.id = ad_id AND a.slot_number IS NOT DISTINCT FROM dashboard_ad_impressions.slot_number));
CREATE POLICY "Service role manages ad impressions" ON public.dashboard_ad_impressions
  FOR ALL TO service_role USING (true) WITH CHECK (true);