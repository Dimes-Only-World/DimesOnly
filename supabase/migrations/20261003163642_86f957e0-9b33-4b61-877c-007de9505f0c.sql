REVOKE ALL ON TABLE public.rental_extensions FROM anon, authenticated;
DROP POLICY IF EXISTS "Renters view their own extensions" ON public.rental_extensions;