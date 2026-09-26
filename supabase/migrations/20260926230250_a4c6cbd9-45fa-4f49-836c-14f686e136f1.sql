ALTER TABLE public.age_gate_leads
ADD COLUMN IF NOT EXISTS selfie_path text;

COMMENT ON COLUMN public.age_gate_leads.selfie_path IS 'Private Storage object path for the age-verification selfie';