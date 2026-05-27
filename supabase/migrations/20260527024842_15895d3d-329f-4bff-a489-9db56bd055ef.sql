-- 1. New columns on users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_business_owner boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS business_owner_elite_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS business_owner_elite_seat_number integer,
  ADD COLUMN IF NOT EXISTS business_owner_elite_granted_at timestamptz;

-- 2. Seats table
CREATE TABLE IF NOT EXISTS public.business_owner_elite_seats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('monthly_active','lifetime','cancelled')),
  months_paid_count integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  lifetime_granted_at timestamptz,
  seat_number integer UNIQUE,
  last_payment_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_boes_user_id ON public.business_owner_elite_seats(user_id);
CREATE INDEX IF NOT EXISTS idx_boes_status ON public.business_owner_elite_seats(status);

GRANT SELECT ON public.business_owner_elite_seats TO authenticated;
GRANT ALL ON public.business_owner_elite_seats TO service_role;

ALTER TABLE public.business_owner_elite_seats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "boes_select_own"
  ON public.business_owner_elite_seats
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "boes_service_all"
  ON public.business_owner_elite_seats
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER trg_boes_updated_at
  BEFORE UPDATE ON public.business_owner_elite_seats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Public stats view (100-seat cap)
CREATE OR REPLACE VIEW public.business_owner_elite_seat_stats
WITH (security_invoker = false) AS
SELECT
  100::integer AS seats_max,
  COALESCE((
    SELECT COUNT(*)::integer
    FROM public.business_owner_elite_seats
    WHERE status IN ('monthly_active','lifetime')
  ), 0) AS seats_taken,
  GREATEST(
    0,
    100 - COALESCE((
      SELECT COUNT(*)::integer
      FROM public.business_owner_elite_seats
      WHERE status IN ('monthly_active','lifetime')
    ), 0)
  ) AS seats_available;

GRANT SELECT ON public.business_owner_elite_seat_stats TO anon, authenticated;