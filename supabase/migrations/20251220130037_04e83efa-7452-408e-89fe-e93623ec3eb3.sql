-- Fix the rollover amount to the correct $9.72 (from old pool: $2.22 current + $7.50 rollover)
UPDATE public.jackpot_pools 
SET rollover_amount = 9.72
WHERE id = '442a4eab-ed31-4731-b03d-ca2e83c601bc';