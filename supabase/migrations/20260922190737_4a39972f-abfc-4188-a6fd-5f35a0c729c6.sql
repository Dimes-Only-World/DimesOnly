CREATE TABLE public.dashboard_ads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_number integer NOT NULL UNIQUE CHECK (slot_number BETWEEN 1 AND 100),
  position integer NOT NULL,
  title text,
  media_url text,
  media_type text NOT NULL DEFAULT 'image' CHECK (media_type IN ('image','gif','video')),
  link_url text,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.dashboard_ads TO anon;
GRANT SELECT ON public.dashboard_ads TO authenticated;
GRANT ALL ON public.dashboard_ads TO service_role;

ALTER TABLE public.dashboard_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active ads" ON public.dashboard_ads
  FOR SELECT USING (is_active = true AND media_url IS NOT NULL);

CREATE POLICY "Service role manages ads" ON public.dashboard_ads
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX dashboard_ads_position_idx ON public.dashboard_ads (position);

INSERT INTO public.dashboard_ads (slot_number, position)
SELECT g, g FROM generate_series(1,100) g;