-- Function to update user's Silver+ status
CREATE OR REPLACE FUNCTION public.update_user_silver_plus(
  user_id_param UUID,
  payment_id_param UUID,
  membership_number_param INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  current_count INTEGER;
  max_memberships INTEGER := 3000;
BEGIN
  -- Get current count of Silver+ members
  SELECT COUNT(*) INTO current_count 
  FROM users 
  WHERE silver_plus_active = true;

  -- Check if we haven't reached the limit
  IF current_count >= max_memberships THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Maximum number of Silver+ memberships reached'
    );
  END IF;

  -- Update the user's record
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

  -- Verify the update was successful
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Return success with updated count
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_user_silver_plus(UUID, UUID, INTEGER) TO authenticated;
