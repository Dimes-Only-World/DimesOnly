ALTER TABLE public.host_applications
  ADD COLUMN IF NOT EXISTS deposit_paypal_order_id text,
  ADD COLUMN IF NOT EXISTS deposit_paypal_capture_id text,
  ADD COLUMN IF NOT EXISTS deposit_paid_at timestamp with time zone;

CREATE UNIQUE INDEX IF NOT EXISTS host_applications_deposit_capture_unique
  ON public.host_applications (deposit_paypal_capture_id)
  WHERE deposit_paypal_capture_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS host_applications_deposit_order_idx
  ON public.host_applications (deposit_paypal_order_id)
  WHERE deposit_paypal_order_id IS NOT NULL;