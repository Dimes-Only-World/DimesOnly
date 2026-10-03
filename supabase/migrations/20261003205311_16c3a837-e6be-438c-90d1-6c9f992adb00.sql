ALTER TABLE public.rental_bookings
  ADD COLUMN IF NOT EXISTS payment_receipt_path text;

COMMENT ON COLUMN public.rental_bookings.payment_receipt_path IS 'Private rental-documents storage path for a verified manual-payment receipt PDF.';