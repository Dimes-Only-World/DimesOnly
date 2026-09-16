CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.email_hook_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON public.email_hook_config FROM anon;
REVOKE ALL ON public.email_hook_config FROM authenticated;
GRANT ALL ON public.email_hook_config TO service_role;

ALTER TABLE public.email_hook_config ENABLE ROW LEVEL SECURITY;

INSERT INTO public.email_hook_config (key, value)
VALUES
  ('function_url', 'https://qkcuykpndrolrewwnkwb.supabase.co/functions/v1/send-dime-email'),
  ('secret', gen_random_uuid()::text)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.dime_email_notify_hook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_secret text;
  v_body jsonb;
BEGIN
  SELECT value INTO v_url FROM public.email_hook_config WHERE key = 'function_url';
  SELECT value INTO v_secret FROM public.email_hook_config WHERE key = 'secret';
  IF v_url IS NULL OR v_secret IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'ratings' THEN
    v_body := jsonb_build_object('type', 'rated', 'rating_id', NEW.id);
  ELSIF TG_TABLE_NAME = 'user_events' THEN
    v_body := jsonb_build_object('type', 'event_join', 'user_event_id', NEW.id);
  ELSE
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    body := v_body,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', v_secret
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dime_email_on_rating ON public.ratings;
CREATE TRIGGER dime_email_on_rating
  AFTER INSERT ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.dime_email_notify_hook();

DROP TRIGGER IF EXISTS dime_email_on_event_join ON public.user_events;
CREATE TRIGGER dime_email_on_event_join
  AFTER INSERT ON public.user_events
  FOR EACH ROW EXECUTE FUNCTION public.dime_email_notify_hook();