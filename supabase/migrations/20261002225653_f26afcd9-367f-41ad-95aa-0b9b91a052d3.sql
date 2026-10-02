ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS early_bird_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS early_bird_limit integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plus_extra_percent numeric NOT NULL DEFAULT 0;