-- Move orphaned tickets from the old closed pool to the current open pool
UPDATE public.jackpot_tickets 
SET pool_id = '442a4eab-ed31-4731-b03d-ca2e83c601bc'
WHERE pool_id = '22db095b-3270-4742-814f-70ab77fd27ac';