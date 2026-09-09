CREATE TABLE public.flix_titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logline text DEFAULT '',
  description text DEFAULT '',
  genres text[] DEFAULT '{}',
  rating text DEFAULT 'R',
  year int DEFAULT 2026,
  duration_minutes int DEFAULT 90,
  cast_members text[] DEFAULT '{}',
  tags text[] DEFAULT '{}',
  poster_url text DEFAULT '',
  backdrop_url text DEFAULT '',
  trailer_url text DEFAULT '',
  video_url text DEFAULT '',
  featured boolean DEFAULT false,
  featured_order int DEFAULT 0,
  is_original boolean DEFAULT false,
  status text NOT NULL DEFAULT 'live',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.flix_titles TO anon;
GRANT SELECT ON public.flix_titles TO authenticated;
GRANT ALL ON public.flix_titles TO service_role;
ALTER TABLE public.flix_titles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read live flix titles" ON public.flix_titles FOR SELECT USING (status = 'live');

CREATE TABLE public.flix_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'monthly',
  status text NOT NULL DEFAULT 'active',
  amount_cents int NOT NULL DEFAULT 599,
  is_demo boolean DEFAULT true,
  referral_code text,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.flix_subscriptions TO authenticated;
GRANT ALL ON public.flix_subscriptions TO service_role;
ALTER TABLE public.flix_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own flix subscription" ON public.flix_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own flix subscription" ON public.flix_subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own flix subscription" ON public.flix_subscriptions FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.flix_watch_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title_id uuid NOT NULL REFERENCES public.flix_titles(id) ON DELETE CASCADE,
  seconds numeric NOT NULL DEFAULT 0,
  duration_seconds numeric DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, title_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flix_watch_progress TO authenticated;
GRANT ALL ON public.flix_watch_progress TO service_role;
ALTER TABLE public.flix_watch_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own watch progress" ON public.flix_watch_progress FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.flix_my_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title_id uuid NOT NULL REFERENCES public.flix_titles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, title_id)
);
GRANT SELECT, INSERT, DELETE ON public.flix_my_list TO authenticated;
GRANT ALL ON public.flix_my_list TO service_role;
ALTER TABLE public.flix_my_list ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own flix list" ON public.flix_my_list FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.flix_referral_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referrer_username text NOT NULL,
  level int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.flix_referral_attributions TO authenticated;
GRANT ALL ON public.flix_referral_attributions TO service_role;
ALTER TABLE public.flix_referral_attributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own flix attribution" ON public.flix_referral_attributions FOR SELECT TO authenticated USING (subscriber_user_id = auth.uid());

CREATE TABLE public.flix_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  earner_username text NOT NULL,
  source_subscriber_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES public.flix_subscriptions(id) ON DELETE SET NULL,
  level int NOT NULL DEFAULT 1,
  amount_cents int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  note text DEFAULT '',
  qualified_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.flix_earnings TO authenticated;
GRANT ALL ON public.flix_earnings TO service_role;
ALTER TABLE public.flix_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Earners read own flix earnings" ON public.flix_earnings FOR SELECT TO authenticated USING (lower(earner_username) = lower((SELECT username FROM public.users WHERE id = auth.uid())));

CREATE TABLE public.flix_payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  amount_cents int NOT NULL,
  method text NOT NULL DEFAULT 'paypal',
  method_details text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  admin_note text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.flix_payout_requests TO authenticated;
GRANT ALL ON public.flix_payout_requests TO service_role;
ALTER TABLE public.flix_payout_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own flix payouts" ON public.flix_payout_requests FOR SELECT TO authenticated USING (lower(username) = lower((SELECT username FROM public.users WHERE id = auth.uid())));
CREATE POLICY "Users insert own flix payouts" ON public.flix_payout_requests FOR INSERT TO authenticated WITH CHECK (lower(username) = lower((SELECT username FROM public.users WHERE id = auth.uid())));

CREATE TABLE public.flix_link_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.flix_link_clicks TO anon;
GRANT SELECT, INSERT ON public.flix_link_clicks TO authenticated;
GRANT ALL ON public.flix_link_clicks TO service_role;
ALTER TABLE public.flix_link_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can record a flix click" ON public.flix_link_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated read flix clicks" ON public.flix_link_clicks FOR SELECT TO authenticated USING (true);