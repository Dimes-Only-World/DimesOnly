CREATE OR REPLACE FUNCTION public.check_silver_plus_availability()
RETURNS TABLE (
  available BOOLEAN,
  current_count INTEGER,
  max_count INTEGER,
  remaining INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    (SELECT COUNT(*) < 300 FROM users WHERE silver_plus_active = true) as available,
    (SELECT COUNT(*)::integer FROM users WHERE silver_plus_active = true) as current_count,
    300 as max_count,
    GREATEST(0, 300 - (SELECT COUNT(*)::integer FROM users WHERE silver_plus_active = true)) as remaining
$$;

CREATE OR REPLACE FUNCTION public.update_user_silver_plus(
  user_id_param UUID,
  payment_id_param UUID,
  membership_number_param INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSONB;
  current_count INTEGER;
  max_memberships INTEGER := 300;
BEGIN
  SELECT COUNT(*) INTO current_count 
  FROM users 
  WHERE silver_plus_active = true;

  IF current_count >= max_memberships THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Maximum number of Silver+ memberships reached'
    );
  END IF;

  UPDATE users
  SET 
    silver_plus_active = true,
    silver_plus_joined_at = NOW(),
    silver_plus_payment_id = payment_id_param,
    silver_plus_membership_number = membership_number_param,
    membership_tier = 'silver_plus',
    membership_type = 'Silver+',
    updated_at = NOW()
  WHERE id = user_id_param;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'current_count', current_count + 1,
    'remaining', GREATEST(0, max_memberships - (current_count + 1))
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;