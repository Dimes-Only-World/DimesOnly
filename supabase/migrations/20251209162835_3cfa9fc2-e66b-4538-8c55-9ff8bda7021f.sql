-- Create function to increment tips_earned for a user
CREATE OR REPLACE FUNCTION public.increment_tips_earned(p_user_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users
  SET 
    tips_earned = COALESCE(tips_earned, 0) + p_amount,
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.increment_tips_earned(uuid, numeric) TO service_role;