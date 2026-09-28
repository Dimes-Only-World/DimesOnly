ALTER TABLE public.vehicle_purchase_applications
  ADD COLUMN IF NOT EXISTS buyer_avatar_path text,
  ADD COLUMN IF NOT EXISTS sale_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS sale_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS sold_at date,
  ADD COLUMN IF NOT EXISTS referrer_user_id uuid,
  ADD COLUMN IF NOT EXISTS upline_user_id uuid,
  ADD COLUMN IF NOT EXISTS referrer_commission numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS upline_commission numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referrer_overridden boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS vpa_referrer_idx ON public.vehicle_purchase_applications(referrer_user_id);
CREATE INDEX IF NOT EXISTS vpa_upline_idx ON public.vehicle_purchase_applications(upline_user_id);

CREATE TABLE public.sale_commission_bonuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  month date NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, month)
);
GRANT ALL ON public.sale_commission_bonuses TO service_role;
ALTER TABLE public.sale_commission_bonuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role only bonuses" ON public.sale_commission_bonuses FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE TRIGGER sale_commission_bonuses_updated BEFORE UPDATE ON public.sale_commission_bonuses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();