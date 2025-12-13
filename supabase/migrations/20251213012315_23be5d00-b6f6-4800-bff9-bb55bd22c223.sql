-- Fix the incorrectly recorded tip transaction referrer
UPDATE tips_transactions 
SET referrer_username = 'syviat'
WHERE id = '812a847d-6852-4d6c-96e4-905d7fcfa17c' 
AND referrer_username = 'topdog';

-- Get syviat's user_id for weekly_earnings update
DO $$
DECLARE
  syviat_id uuid;
  topdog_id uuid;
BEGIN
  SELECT id INTO syviat_id FROM users WHERE username = 'syviat';
  SELECT id INTO topdog_id FROM users WHERE username = 'topdog';
  
  -- Remove the incorrect referral earnings from topdog
  UPDATE weekly_earnings 
  SET referral_earnings = 0, amount = amount - 0.44
  WHERE user_id = topdog_id 
  AND week_start = '2025-11-16';
  
  -- Add referral earnings to syviat (insert or update)
  INSERT INTO weekly_earnings (user_id, week_start, week_end, amount, tip_earnings, referral_earnings, bonus_earnings)
  VALUES (syviat_id, '2025-11-16', '2025-11-30', 0.44, 0, 0.44, 0)
  ON CONFLICT (user_id, week_start) 
  DO UPDATE SET 
    referral_earnings = weekly_earnings.referral_earnings + 0.44,
    amount = weekly_earnings.amount + 0.44;
END $$;

-- Update users table referral_fees
UPDATE users SET referral_fees = referral_fees + 0.44 WHERE username = 'syviat';
UPDATE users SET referral_fees = GREATEST(0, referral_fees - 0.44) WHERE username = 'topdog';