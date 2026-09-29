REVOKE ALL ON public.reward_contests FROM anon, authenticated;
CREATE POLICY "No direct client access" ON public.reward_contests FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);