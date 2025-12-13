-- Create the missing increment_tips_earned function
CREATE OR REPLACE FUNCTION public.increment_tips_earned(p_user_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE users
  SET tips_earned = COALESCE(tips_earned, 0) + p_amount,
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;

-- Create increment_referral_fees function if not exists
CREATE OR REPLACE FUNCTION public.increment_referral_fees(p_user_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE users
  SET referral_fees = COALESCE(referral_fees, 0) + p_amount,
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;

-- Create a view for detailed tip allocation audit trail
CREATE OR REPLACE VIEW public.v_tip_allocation_audit AS
SELECT 
  jl.id as ledger_id,
  jl.created_at as transaction_date,
  jl.gross_amount,
  jl.fee_percent,
  jl.fee_fixed,
  jl.fee_amount as paypal_fee,
  jl.to_dime as performer_share,
  jl.to_referred_dime as referrer_share,
  jl.to_jackpot as jackpot_contribution,
  jl.to_company as company_share,
  ROUND((jl.gross_amount - jl.fee_amount)::numeric, 2) as net_after_fees,
  t.tipper_username,
  t.tipped_username,
  t.referrer_username,
  t.tickets_generated,
  performer.username as performer_name,
  referrer.username as referrer_name
FROM jackpot_ledger jl
LEFT JOIN tips t ON t.id = jl.tip_id
LEFT JOIN users performer ON performer.id = jl.dime_id
LEFT JOIN users referrer ON referrer.id = jl.referred_dime_id
ORDER BY jl.created_at DESC;

-- Grant access to the view
GRANT SELECT ON public.v_tip_allocation_audit TO authenticated;
GRANT SELECT ON public.v_tip_allocation_audit TO service_role;

-- Grant execute on the functions
GRANT EXECUTE ON FUNCTION public.increment_tips_earned(uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_referral_fees(uuid, numeric) TO service_role;