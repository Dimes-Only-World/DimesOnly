CREATE OR REPLACE FUNCTION public.handle_flix_subscription_earnings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer RECORD;
  v_upline RECORD;
BEGIN
  -- Only when a referral code is present
  IF NEW.referral_code IS NULL OR btrim(NEW.referral_code) = '' THEN
    RETURN NEW;
  END IF;

  -- Resolve the referrer by username (case-insensitive); never pay the subscriber themselves
  SELECT id, username, referred_by INTO v_referrer
  FROM public.users
  WHERE lower(username) = lower(NEW.referral_code)
  LIMIT 1;

  IF NOT FOUND OR v_referrer.id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Record the attribution
  INSERT INTO public.flix_referral_attributions (subscriber_id, referrer_id, referral_code)
  VALUES (NEW.user_id, v_referrer.id, NEW.referral_code)
  ON CONFLICT (subscriber_id) DO NOTHING;

  -- 10% direct residual
  INSERT INTO public.flix_earnings (user_id, subscription_id, subscriber_id, level, amount_cents, status)
  VALUES (v_referrer.id, NEW.id, NEW.user_id, 1, round(NEW.amount_cents * 0.10), 'qualified');

  -- 5% override to the referrer's upline, if any, and not the subscriber
  IF v_referrer.referred_by IS NOT NULL AND btrim(v_referrer.referred_by) <> '' THEN
    SELECT id INTO v_upline
    FROM public.users
    WHERE lower(username) = lower(v_referrer.referred_by)
    LIMIT 1;

    IF FOUND AND v_upline.id <> NEW.user_id AND v_upline.id <> v_referrer.id THEN
      INSERT INTO public.flix_earnings (user_id, subscription_id, subscriber_id, level, amount_cents, status)
      VALUES (v_upline.id, NEW.id, NEW.user_id, 2, round(NEW.amount_cents * 0.05), 'qualified');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_flix_subscription_earnings ON public.flix_subscriptions;
CREATE TRIGGER trg_flix_subscription_earnings
AFTER INSERT ON public.flix_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.handle_flix_subscription_earnings();