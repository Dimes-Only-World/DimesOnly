ALTER TABLE public.host_applications
  ADD COLUMN IF NOT EXISTS vehicle_photo_path text,
  ADD COLUMN IF NOT EXISTS earnings_total numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.host_app_set_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.user_id := auth.uid();
  NEW.earnings_total := 0;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS host_app_set_owner ON public.host_applications;
CREATE TRIGGER host_app_set_owner BEFORE INSERT ON public.host_applications
FOR EACH ROW EXECUTE FUNCTION public.host_app_set_owner();

GRANT SELECT ON public.host_applications TO authenticated;
DROP POLICY IF EXISTS "Owners view own host applications" ON public.host_applications;
CREATE POLICY "Owners view own host applications" ON public.host_applications
FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Owners view own host documents" ON storage.objects;
CREATE POLICY "Owners view own host documents" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'host-documents' AND EXISTS (
    SELECT 1 FROM public.host_applications h
    WHERE h.user_id = auth.uid() AND h.vehicle_photo_path = storage.objects.name
  )
);