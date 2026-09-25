DROP INDEX IF EXISTS public.host_applications_deposit_capture_unique;
CREATE INDEX IF NOT EXISTS host_applications_deposit_capture_idx
  ON public.host_applications (deposit_paypal_capture_id)
  WHERE deposit_paypal_capture_id IS NOT NULL;