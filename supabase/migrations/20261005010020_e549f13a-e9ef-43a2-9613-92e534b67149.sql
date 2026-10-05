CREATE OR REPLACE FUNCTION public.guard_payout_request_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF coalesce(NEW.amount, 0) < 250 THEN
    RAISE EXCEPTION 'Minimum payout is $250';
  END IF;
  IF EXISTS (SELECT 1 FROM public.payout_requests
             WHERE user_id = NEW.user_id AND request_status IN ('pending','processing')) THEN
    RAISE EXCEPTION 'You already have a payout request in processing';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS guard_payout_request_insert ON public.payout_requests;
CREATE TRIGGER guard_payout_request_insert
BEFORE INSERT ON public.payout_requests
FOR EACH ROW EXECUTE FUNCTION public.guard_payout_request_insert();