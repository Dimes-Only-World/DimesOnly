CREATE TABLE public.flyer_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  flyer_id text NOT NULL,
  flyer_title text NOT NULL DEFAULT '',
  channel text NOT NULL,
  shared_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.flyer_shares TO service_role;
ALTER TABLE public.flyer_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages flyer shares" ON public.flyer_shares
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX flyer_shares_user_idx ON public.flyer_shares (user_id, shared_at DESC);