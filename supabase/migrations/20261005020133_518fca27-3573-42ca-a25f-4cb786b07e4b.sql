ALTER TABLE public.payout_requests DROP CONSTRAINT IF EXISTS payout_requests_payout_method_check;
ALTER TABLE public.payout_requests ADD CONSTRAINT payout_requests_payout_method_check
  CHECK (payout_method IN ('paypal','venmo','cashapp','wire','direct_deposit','check'));