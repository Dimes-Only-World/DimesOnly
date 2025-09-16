-- Migration: Update payout methods to support Venmo and Direct Deposit (ACH)
-- Adds 'venmo' and 'direct_deposit' to payout_method CHECK constraint
-- Updates validation function to remove Cash App requirement and add ACH rules

BEGIN;

-- Drop any existing CHECK constraint that references payout_method on payout_requests, regardless of its name
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc
      ON cc.constraint_name = tc.constraint_name
      AND cc.constraint_schema = tc.constraint_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'payout_requests'
      AND tc.constraint_type = 'CHECK'
      AND cc.check_clause ILIKE '%payout_method%'
      AND cc.check_clause NOT ILIKE '%IS NOT NULL%'
      AND (
        cc.check_clause ILIKE '%= ANY%'
        OR cc.check_clause ILIKE '% IN (%'
        OR cc.check_clause ILIKE '%ANY (ARRAY%'
      )
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.payout_requests DROP CONSTRAINT %I', r.constraint_name);
    EXCEPTION WHEN undefined_object THEN
      -- Ignore if already dropped or not a droppable named check
      NULL;
    WHEN others THEN
      -- Be defensive and skip any unexpected constraint shapes
      NULL;
    END;
  END LOOP;
END $$;

-- Normalize payout_method values (lowercase, trim)
UPDATE public.payout_requests
SET payout_method = lower(btrim(payout_method))
WHERE payout_method IS NOT NULL;

-- Data migration: convert legacy Cash App variants to 'venmo' and store source in notes if empty
UPDATE public.payout_requests
SET
  payout_method = 'venmo',
  notes = CASE
    WHEN (notes IS NULL OR length(trim(notes)) = 0) THEN (
      jsonb_build_object(
        'type','venmo',
        'migrated_from','cashapp',
        'cashtag', cashapp_cashtag,
        'phone', cashapp_phone,
        'email', cashapp_email
      )
    )::text
    ELSE notes
  END
WHERE payout_method IN ('cashapp','cash app','cash_app','cash-app');

-- Map common ACH/Direct Deposit synonyms to 'direct_deposit'
UPDATE public.payout_requests
SET payout_method = 'direct_deposit'
WHERE payout_method IN ('direct deposit','direct-deposit','ach','ach_payment','ach payment');

-- As a last resort, coerce any unknown payout_method to 'paypal' and annotate if notes is empty
UPDATE public.payout_requests
SET
  payout_method = 'paypal',
  notes = CASE
    WHEN (notes IS NULL OR length(trim(notes)) = 0) THEN (
      jsonb_build_object('migrated_from_unknown_method', true)
    )::text
    ELSE notes
  END
WHERE payout_method NOT IN ('paypal','venmo','wire','direct_deposit','check');

ALTER TABLE public.payout_requests
  ADD CONSTRAINT payout_requests_payout_method_check
  CHECK (payout_method IN ('paypal','venmo','wire','direct_deposit','check'));

-- Replace validation function logic
CREATE OR REPLACE FUNCTION public.validate_payout_method_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate PayPal
  IF NEW.payout_method = 'paypal' THEN
    IF NEW.paypal_email IS NULL OR NEW.paypal_email = '' THEN
      RAISE EXCEPTION 'PayPal email is required for PayPal payouts';
    END IF;
  END IF;

  -- Validate Venmo (require notes payload to be present)
  IF NEW.payout_method = 'venmo' THEN
    IF NEW.notes IS NULL OR length(trim(NEW.notes)) = 0 THEN
      RAISE EXCEPTION 'Notes JSON must be provided for Venmo payouts (store username/phone/email)';
    END IF;
  END IF;

  -- Validate Wire Transfer
  IF NEW.payout_method = 'wire' THEN
    IF NEW.wire_bank_name IS NULL OR NEW.wire_routing_number IS NULL OR 
       NEW.wire_account_number IS NULL OR NEW.wire_account_holder_name IS NULL OR
       NEW.wire_account_type IS NULL THEN
      RAISE EXCEPTION 'All core wire transfer fields are required for wire payouts';
    END IF;
  END IF;

  -- Validate Direct Deposit (ACH): same core requirements as wire, SWIFT/address optional
  IF NEW.payout_method = 'direct_deposit' THEN
    IF NEW.wire_bank_name IS NULL OR NEW.wire_routing_number IS NULL OR 
       NEW.wire_account_number IS NULL OR NEW.wire_account_holder_name IS NULL OR
       NEW.wire_account_type IS NULL THEN
      RAISE EXCEPTION 'All core bank fields are required for ACH (direct deposit) payouts';
    END IF;
  END IF;

  -- Validate Check by Mail
  IF NEW.payout_method = 'check' THEN
    IF NEW.check_full_name IS NULL OR NEW.check_address_line1 IS NULL OR 
       NEW.check_city IS NULL OR NEW.check_state IS NULL OR NEW.check_zip_code IS NULL THEN
      RAISE EXCEPTION 'All address fields are required for check payouts';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
