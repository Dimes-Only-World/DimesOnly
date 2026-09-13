ALTER TABLE public.flix_subscriptions
  ADD COLUMN IF NOT EXISTS paypal_order_id text,
  ADD COLUMN IF NOT EXISTS paypal_capture_id text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS notify_phone text;

ALTER TABLE public.flix_subscriptions ALTER COLUMN is_demo SET DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS flix_subscriptions_paypal_capture_id_key
  ON public.flix_subscriptions (paypal_capture_id) WHERE paypal_capture_id IS NOT NULL;