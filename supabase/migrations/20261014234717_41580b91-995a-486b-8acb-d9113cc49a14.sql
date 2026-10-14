REVOKE ALL ON public.email_logs FROM anon, authenticated;
CREATE POLICY "No direct access to email logs" ON public.email_logs FOR SELECT TO authenticated USING (false);