ALTER TABLE public.age_gate_leads ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
CREATE INDEX IF NOT EXISTS age_gate_leads_deleted_at_idx ON public.age_gate_leads (deleted_at);