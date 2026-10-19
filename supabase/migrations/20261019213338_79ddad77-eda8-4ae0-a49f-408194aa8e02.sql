CREATE TABLE public.rental_notifications_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id uuid NOT NULL,
  kind text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ref_id, kind)
);
GRANT ALL ON public.rental_notifications_sent TO service_role;
REVOKE ALL ON public.rental_notifications_sent FROM anon, authenticated;
ALTER TABLE public.rental_notifications_sent ENABLE ROW LEVEL SECURITY;