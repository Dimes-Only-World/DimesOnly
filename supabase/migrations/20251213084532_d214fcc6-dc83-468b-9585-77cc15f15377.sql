-- Create admin user in auth.users first
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  raw_app_meta_data,
  raw_user_meta_data
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'talent@gmail.com',
  crypt('abc123!!!', gen_salt('bf', 12)),
  now(),
  now(),
  now(),
  '',
  '{"provider":"email","providers":["email"]}',
  '{}'
)
ON CONFLICT (id) DO NOTHING;

-- Create matching public.users entry
INSERT INTO public.users (
  id,
  username,
  email,
  password_hash,
  hash_type,
  user_type,
  first_name,
  created_at
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'admin',
  'talent@gmail.com',
  '$2a$12$rKxPBPQ2wHZ8UvYGVgQ5.OQr9V2.0qFJI9hzP.kPZqGkJE.8LQXGG',
  'bcrypt',
  'normal',
  'Admin',
  now()
)
ON CONFLICT (username) DO UPDATE SET
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  hash_type = EXCLUDED.hash_type;

-- Assign admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('a0000000-0000-0000-0000-000000000001', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Delete old admin user if exists
DELETE FROM public.users WHERE username = 'admino1';