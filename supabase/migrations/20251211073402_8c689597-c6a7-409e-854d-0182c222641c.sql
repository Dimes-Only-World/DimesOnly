-- Fix 1: Enable RLS on _view_backup table and restrict to service_role only
ALTER TABLE public._view_backup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "_view_backup_service_only" ON public._view_backup
  FOR ALL USING (auth.role() = 'service_role');

-- Fix 2: Drop overly permissive users_select_public_limited policy
DROP POLICY IF EXISTS "users_select_public_limited" ON public.users;

-- Create a secure view for public user profiles (only non-sensitive fields)
CREATE OR REPLACE VIEW public.public_user_profiles 
WITH (security_invoker = true) AS
SELECT 
  id,
  username,
  profile_photo,
  banner_photo,
  front_page_photo,
  user_type,
  bio,
  about_me,
  is_ranked,
  rank_number,
  likes,
  membership_tier
FROM public.users;

-- Fix 3: Drop overly permissive jackpot_tickets aggregate policies
DROP POLICY IF EXISTS "select_pool_aggregate" ON public.jackpot_tickets;
DROP POLICY IF EXISTS "select_pool_aggregate_anon" ON public.jackpot_tickets;

-- Create secure aggregate view for jackpot pool stats (no user IDs exposed)
CREATE OR REPLACE VIEW public.v_jackpot_pool_stats 
WITH (security_invoker = true) AS
SELECT 
  pool_id,
  draw_date,
  COUNT(*) as total_tickets
FROM public.jackpot_tickets
GROUP BY pool_id, draw_date;