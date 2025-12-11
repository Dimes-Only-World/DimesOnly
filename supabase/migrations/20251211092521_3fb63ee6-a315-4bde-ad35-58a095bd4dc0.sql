-- Drop and recreate public_user_profiles view with security_invoker = false
-- This allows public access to non-sensitive profile data
DROP VIEW IF EXISTS public_user_profiles;

CREATE VIEW public_user_profiles 
WITH (security_invoker = false)
AS
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
FROM users;

-- Grant SELECT to anonymous and authenticated users
GRANT SELECT ON public_user_profiles TO anon, authenticated;