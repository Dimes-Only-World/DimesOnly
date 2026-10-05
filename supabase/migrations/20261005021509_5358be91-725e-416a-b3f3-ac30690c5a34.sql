REVOKE ALL ON public.cashapp_payments FROM anon, authenticated;
CREATE POLICY "No direct client access" ON public.cashapp_payments FOR ALL TO authenticated USING (false) WITH CHECK (false);