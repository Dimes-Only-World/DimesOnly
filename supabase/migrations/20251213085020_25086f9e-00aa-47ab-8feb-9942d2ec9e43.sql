-- Update admin password with correctly generated bcrypt hash
-- Using crypt() function which is available via pgcrypto extension
UPDATE public.users 
SET password_hash = crypt('abc123!!!', gen_salt('bf', 12))
WHERE username = 'admin';