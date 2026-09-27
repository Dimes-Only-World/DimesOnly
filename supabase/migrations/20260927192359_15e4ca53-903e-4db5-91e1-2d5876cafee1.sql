CREATE TABLE public.ai_selfie_check_control (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT true,
  monthly_credit_limit numeric NOT NULL DEFAULT 100,
  credits_per_check numeric NOT NULL DEFAULT 0.1,
  period_month text NOT NULL DEFAULT to_char(now() AT TIME ZONE 'UTC','YYYY-MM'),
  checks_this_month int NOT NULL DEFAULT 0,
  credits_this_month numeric NOT NULL DEFAULT 0,
  skipped_this_month int NOT NULL DEFAULT 0,
  alerts_reached int[] NOT NULL DEFAULT '{}',
  paused_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ai_selfie_check_control TO service_role;
ALTER TABLE public.ai_selfie_check_control ENABLE ROW LEVEL SECURITY;
INSERT INTO public.ai_selfie_check_control (id) VALUES (1);