CREATE TABLE public.credit_app_reveal_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL,
  admin_user_id uuid,
  person text NOT NULL,
  field text NOT NULL,
  revealed_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.credit_app_reveal_log TO service_role;
ALTER TABLE public.credit_app_reveal_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX credit_app_reveal_log_app_idx ON public.credit_app_reveal_log (application_id, revealed_at DESC);