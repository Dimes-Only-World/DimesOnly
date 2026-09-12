CREATE OR REPLACE FUNCTION public.tip_leaderboard_top_dimes(p_year integer, p_limit integer DEFAULT 3)
RETURNS TABLE(
  user_id uuid,
  username text,
  profile_photo text,
  city text,
  state text,
  total_tipped numeric,
  tip_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id,
    u.username,
    u.profile_photo,
    u.city,
    u.state,
    SUM(t.tip_amount)::numeric AS total_tipped,
    COUNT(*)::bigint AS tip_count
  FROM public.tips_transactions t
  JOIN public.users u
    ON u.id = t.tipped_user_id
    OR lower(u.username) = lower(t.tipped_username)
  WHERE t.payment_status = 'completed'
    AND t.created_at >= make_timestamptz(p_year, 1, 1, 0, 0, 0)
    AND t.created_at <  make_timestamptz(p_year + 1, 1, 1, 0, 0, 0)
    AND lower(coalesce(u.user_type, '')) IN ('stripper', 'exotic')
  GROUP BY u.id, u.username, u.profile_photo, u.city, u.state
  ORDER BY total_tipped DESC
  LIMIT greatest(coalesce(p_limit, 3), 1);
$$;

CREATE OR REPLACE FUNCTION public.tip_leaderboard_top_tippers(p_year integer, p_limit integer DEFAULT 1)
RETURNS TABLE(
  user_id uuid,
  username text,
  profile_photo text,
  total_tipped numeric,
  tip_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id,
    u.username,
    u.profile_photo,
    SUM(t.tip_amount)::numeric AS total_tipped,
    COUNT(*)::bigint AS tip_count
  FROM public.tips_transactions t
  JOIN public.users u ON u.id = t.tipper_user_id
  WHERE t.payment_status = 'completed'
    AND t.created_at >= make_timestamptz(p_year, 1, 1, 0, 0, 0)
    AND t.created_at <  make_timestamptz(p_year + 1, 1, 1, 0, 0, 0)
  GROUP BY u.id, u.username, u.profile_photo
  ORDER BY total_tipped DESC
  LIMIT greatest(coalesce(p_limit, 1), 1);
$$;

REVOKE ALL ON FUNCTION public.tip_leaderboard_top_dimes(integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tip_leaderboard_top_tippers(integer, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.tip_leaderboard_top_dimes(integer, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.tip_leaderboard_top_tippers(integer, integer) TO anon, authenticated, service_role;