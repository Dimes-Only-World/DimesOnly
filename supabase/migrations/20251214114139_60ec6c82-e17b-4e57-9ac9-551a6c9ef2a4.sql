-- Delete test accounts from users table
DELETE FROM public.users 
WHERE username IN ('test_tipper', 'test_performer', 'test_referrer');

-- Also clean up any related data
DELETE FROM public.tips_transactions WHERE tipped_username = 'test_performer';
DELETE FROM public.tips WHERE tipped_username = 'test_performer';
DELETE FROM public.jackpot_tickets WHERE tipper_id IN (
  SELECT id FROM public.users WHERE username IN ('test_tipper', 'test_performer', 'test_referrer')
);
DELETE FROM public.weekly_earnings WHERE user_id IN (
  SELECT id FROM public.users WHERE username IN ('test_tipper', 'test_performer', 'test_referrer')
);
DELETE FROM public.payments WHERE user_id IN (
  SELECT id FROM public.users WHERE username IN ('test_tipper', 'test_performer', 'test_referrer')
);