CREATE TABLE public.age_gate_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  referral_code TEXT,
  action_taken TEXT NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT ALL ON public.age_gate_leads TO service_role;
GRANT SELECT ON public.age_gate_leads TO authenticated;

ALTER TABLE public.age_gate_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view age gate leads"
ON public.age_gate_leads
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE TRIGGER update_age_gate_leads_updated_at
BEFORE UPDATE ON public.age_gate_leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_age_gate_leads_created_at ON public.age_gate_leads (created_at DESC);