-- Fix NULL string fields in auth.users that cause scan errors
-- and ensure the encrypted_password is set correctly for Supabase Auth
UPDATE auth.users
SET 
  email_change = COALESCE(email_change, ''),
  phone_change = COALESCE(phone_change, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  encrypted_password = crypt('abc123!!!', gen_salt('bf'))
WHERE id = 'a0000000-0000-0000-0000-000000000001';