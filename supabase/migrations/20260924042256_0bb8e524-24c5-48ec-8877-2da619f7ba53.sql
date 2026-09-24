-- Hide FlameFlix video links from direct reads; only active subscribers get them via RPC
REVOKE SELECT ON public.flix_titles FROM anon, authenticated;
GRANT SELECT (id,name,logline,description,genres,rating,year,duration_minutes,cast_members,tags,poster_url,backdrop_url,trailer_url,featured,featured_order,is_original,status,created_at,updated_at,poster_mobile_url,backdrop_mobile_url,coming_soon) ON public.flix_titles TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.flix_get_video_url(p_title_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.video_url
  FROM public.flix_titles t
  WHERE t.id = p_title_id
    AND t.status = 'live'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.flix_subscriptions s
      WHERE s.user_id = auth.uid() AND s.status = 'active'
        AND (s.current_period_end IS NULL OR s.current_period_end > now())
    )
$$;
REVOKE EXECUTE ON FUNCTION public.flix_get_video_url(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.flix_get_video_url(uuid) TO authenticated;

-- Ad clicks: bound the stored text so reports can't carry junk/formulas
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='dashboard_ad_clicks' AND cmd='INSERT' LOOP
    EXECUTE format('DROP POLICY %I ON public.dashboard_ad_clicks', r.policyname);
  END LOOP;
END $$;
CREATE POLICY "Record own or anonymous ad clicks"
ON public.dashboard_ad_clicks FOR INSERT TO anon, authenticated
WITH CHECK (
  ((auth.uid() IS NULL AND user_id IS NULL AND username IS NULL)
   OR (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid())
       AND (username IS NULL OR username = public.current_username())))
  AND (link_url IS NULL OR (length(link_url) <= 500 AND link_url ~ '^https?://'
       AND link_url = (SELECT a.link_url FROM public.dashboard_ads a WHERE a.id = ad_id)))
);