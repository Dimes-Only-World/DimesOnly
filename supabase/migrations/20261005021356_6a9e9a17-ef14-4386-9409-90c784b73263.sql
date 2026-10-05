CREATE TABLE public.cashapp_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('tip','event','store','membership','host_deposit')),
  reference_id text,
  user_id uuid NOT NULL,
  username text,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  payment_code text NOT NULL UNIQUE,
  description text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','rejected')),
  cashapp_reference text,
  confirmed_by uuid,
  confirmed_at timestamptz,
  rejected_reason text,
  fulfillment_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.cashapp_payments TO service_role;
ALTER TABLE public.cashapp_payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX cashapp_payments_status_idx ON public.cashapp_payments(status, created_at DESC);
CREATE INDEX cashapp_payments_user_idx ON public.cashapp_payments(user_id, created_at DESC);