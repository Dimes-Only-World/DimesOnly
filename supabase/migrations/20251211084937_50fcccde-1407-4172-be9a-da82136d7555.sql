-- Fix RLS policies on users table to prevent password hash exposure
-- Drop the overly permissive policies that expose ALL columns including password_hash

DROP POLICY IF EXISTS "anon_public_profiles_read" ON public.users;
DROP POLICY IF EXISTS "public_user_profiles_read" ON public.users;

-- Drop existing view first to recreate with correct columns
DROP VIEW IF EXISTS public.public_user_profiles;

-- Create a secure public profile view that only exposes safe columns
-- This replaces direct table access for public profile browsing
CREATE VIEW public.public_user_profiles WITH (security_invoker = true) AS
SELECT 
  id,
  username,
  profile_photo,
  banner_photo,
  front_page_photo,
  user_type,
  bio,
  is_ranked,
  rank_number,
  first_name,
  city,
  state,
  membership_type,
  membership_tier,
  tips_earned,
  referral_fees,
  created_at
FROM public.users;

-- Grant select on the view to authenticated and anon users
GRANT SELECT ON public.public_user_profiles TO authenticated;
GRANT SELECT ON public.public_user_profiles TO anon;