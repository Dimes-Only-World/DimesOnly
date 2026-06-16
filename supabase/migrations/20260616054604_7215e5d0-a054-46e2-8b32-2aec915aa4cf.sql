DROP POLICY IF EXISTS tips_transactions_select_own ON public.tips_transactions;

CREATE POLICY tips_transactions_select_own
ON public.tips_transactions
FOR SELECT
USING (
  tipper_user_id = auth.uid()
  OR tipped_user_id = auth.uid()
  OR LOWER(referrer_username) = LOWER(public.get_my_username())
);