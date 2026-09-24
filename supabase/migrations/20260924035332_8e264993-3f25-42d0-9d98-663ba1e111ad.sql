
-- Helper: current caller's username
CREATE OR REPLACE FUNCTION public.current_username()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT username FROM public.users WHERE id = auth.uid()
$$;
REVOKE EXECUTE ON FUNCTION public.current_username() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_username() TO authenticated;

-- entries: owner-only
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.entries;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.entries;
CREATE POLICY "Owners insert own entries" ON public.entries FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owners read own entries" ON public.entries FOR SELECT TO authenticated USING (user_id = auth.uid());

-- tickets: owner-only
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.tickets;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.tickets;
CREATE POLICY "Owners read own tickets" ON public.tickets FOR SELECT TO authenticated
  USING ("user_Id"::text = auth.uid()::text OR lower(username) = lower(public.current_username()));

-- tips: only parties to the tip can read; inserts via server only
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.tips;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.tips;
CREATE POLICY "Tip parties read their tips" ON public.tips FOR SELECT TO authenticated
  USING (
    user_id::text = auth.uid()::text
    OR lower(tipper_username) = lower(public.current_username())
    OR lower(tipped_username) = lower(public.current_username())
    OR lower(referrer_username) = lower(public.current_username())
  );

-- events: remove duplicate signed-in-only read rule (public read rules remain)
DROP POLICY IF EXISTS "Events are viewable by authenticated users" ON public.events;

-- user_media: remove read-everything rule; tier/own-media rules remain
DROP POLICY IF EXISTS "Allow authenticated users to view user media" ON public.user_media;

-- ad clicks: can only record clicks as yourself (or anonymously)
DROP POLICY IF EXISTS "Anyone can record an ad click" ON public.dashboard_ad_clicks;
CREATE POLICY "Record own ad click" ON public.dashboard_ad_clicks FOR INSERT TO anon, authenticated
  WITH CHECK ((user_id IS NULL AND auth.uid() IS NULL) OR user_id = auth.uid());

-- flix clicks: bounded insert, no client reads
DROP POLICY IF EXISTS "Anyone can record a flix click" ON public.flix_link_clicks;
DROP POLICY IF EXISTS "Authenticated read flix clicks" ON public.flix_link_clicks;
CREATE POLICY "Record flix click" ON public.flix_link_clicks FOR INSERT TO anon, authenticated
  WITH CHECK (referral_code IS NOT NULL AND length(referral_code) BETWEEN 1 AND 64);

-- storage: promo-videos writes
DROP POLICY IF EXISTS "Authenticated users can delete promo videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update promo videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload promo videos" ON storage.objects;
CREATE POLICY "Signed-in users upload own promo videos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'promo-videos' AND owner_id = (select auth.uid()::text));

-- storage: event media cannot be overwritten by anonymous callers
DROP POLICY IF EXISTS "Event photos update anon or auth" ON storage.objects;
DROP POLICY IF EXISTS "Event videos update anon or auth" ON storage.objects;

-- storage: host documents only by the signed-in owner
DROP POLICY IF EXISTS "Anyone can upload host documents" ON storage.objects;
CREATE POLICY "Owners upload host documents" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'host-documents' AND owner_id = (select auth.uid()::text));
