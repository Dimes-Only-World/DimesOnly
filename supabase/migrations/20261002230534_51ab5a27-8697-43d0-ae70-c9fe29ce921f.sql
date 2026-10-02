CREATE OR REPLACE FUNCTION public.get_public_referrers(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, referrer_username text, referrer_photo text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id,
         COALESCE(r.username, 'Company')::text,
         COALESCE(r.front_page_photo, r.profile_photo)::text
  FROM public.users u
  LEFT JOIN public.users r ON lower(r.username) = lower(u.referred_by)
  WHERE u.id = ANY(p_user_ids)
    AND u.user_type IN ('stripper','exotic')
  LIMIT 50
$$;
GRANT EXECUTE ON FUNCTION public.get_public_referrers(uuid[]) TO anon, authenticated;