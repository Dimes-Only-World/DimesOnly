ALTER TABLE public.payout_requests
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_reference text,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_reason text,
  ADD COLUMN IF NOT EXISTS earnings_breakdown jsonb;
ALTER TABLE public.payout_requests DROP CONSTRAINT IF EXISTS payout_requests_request_status_check;
ALTER TABLE public.payout_requests ADD CONSTRAINT payout_requests_request_status_check
  CHECK (request_status = ANY (ARRAY['pending','processing','completed','failed','cancelled','refunded']));