DROP VIEW IF EXISTS public_user_profiles;

CREATE OR REPLACE VIEW public_user_profiles WITH (security_invoker = false) AS
SELECT 
  id,
  username,
  profile_photo,
  banner_photo,
  front_page_photo,
  user_type,
  gender,
  bio,
  is_ranked,
  rank_number,
  user_rank,
  first_name,
  city,
  state,
  membership_type,
  membership_tier,
  diamond_plus_active,
  silver_plus_active,
  tips_earned,
  referral_fees,
  video_urls,
  created_at
FROM users;

GRANT SELECT ON public_user_profiles TO anon;
GRANT SELECT ON public_user_profiles TO authenticated;