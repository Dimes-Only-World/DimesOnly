ALTER TABLE public.reward_contests
  ALTER COLUMN ends_at DROP NOT NULL,
  ADD COLUMN background_image_url text,
  ADD COLUMN featured_user_id uuid;

COMMENT ON COLUMN public.reward_contests.ends_at IS 'Optional expiration; goal contests can remain active until the goal is reached.';
COMMENT ON COLUMN public.reward_contests.background_image_url IS 'Optional background image shown in the member rewards carousel.';
COMMENT ON COLUMN public.reward_contests.featured_user_id IS 'Optional member selected by an admin to feature with avatar and username.';