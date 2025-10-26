-- Create function to update user password hash
CREATE OR REPLACE FUNCTION update_user_password(
  user_id UUID,
  new_password_hash TEXT,
  hash_type TEXT DEFAULT 'bcrypt'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE users 
  SET 
    password_hash = new_password_hash,
    hash_type = hash_type,
    updated_at = NOW()
  WHERE id = user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found with ID: %', user_id;
  END IF;
END;
$$;
