CREATE TABLE public.vehicle_costs (
  vehicle_id uuid PRIMARY KEY REFERENCES public.vehicles(id) ON DELETE CASCADE,
  monthly_payment numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.vehicle_costs TO service_role;
ALTER TABLE public.vehicle_costs ENABLE ROW LEVEL SECURITY;