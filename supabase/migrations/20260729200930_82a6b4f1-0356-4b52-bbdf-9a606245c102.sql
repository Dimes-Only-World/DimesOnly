CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_settings TO anon;
GRANT SELECT ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app settings"
  ON public.app_settings FOR SELECT USING (true);

CREATE POLICY "Admins can manage app settings"
  ON public.app_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER app_settings_set_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.app_settings (key, value)
VALUES ('app_public_launch_at', jsonb_build_object('value', null))
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS free_membership_tier text,
  ADD COLUMN IF NOT EXISTS free_membership_years integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS free_membership_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS membership_source text NOT NULL DEFAULT 'free_promo',
  ADD COLUMN IF NOT EXISTS membership_paid_tier text,
  ADD COLUMN IF NOT EXISTS membership_reverted_at timestamptz;

UPDATE public.users
SET free_membership_tier = CASE
      WHEN user_type IN ('exotic','stripper') THEN 'diamond'
      ELSE 'silver'
    END
WHERE free_membership_tier IS NULL;