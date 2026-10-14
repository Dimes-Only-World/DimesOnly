CREATE TABLE public.email_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), recipient_email text NOT NULL, recipient_name text, category text, subject text, status text NOT NULL, status_code integer, error text, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.email_logs TO service_role;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX email_logs_created_idx ON public.email_logs(created_at DESC);