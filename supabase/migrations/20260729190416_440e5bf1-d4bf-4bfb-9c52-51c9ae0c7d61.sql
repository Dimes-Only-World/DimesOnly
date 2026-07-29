-- 1) Clean existing referral names (strip newlines/tabs/zero-width/nbsp, collapse spaces)
UPDATE public.users
SET referred_by = NULLIF(btrim(regexp_replace(regexp_replace(referred_by, '[\u200B\u200C\u200D\uFEFF\u00A0]', ' ', 'g'), '\s+', ' ', 'g')), '')
WHERE referred_by IS NOT NULL
  AND referred_by IS DISTINCT FROM NULLIF(btrim(regexp_replace(regexp_replace(referred_by, '[\u200B\u200C\u200D\uFEFF\u00A0]', ' ', 'g'), '\s+', ' ', 'g')), '');

-- 2) Keep future writes clean
CREATE OR REPLACE FUNCTION public.normalize_referred_by()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.referred_by IS NOT NULL THEN
    NEW.referred_by := NULLIF(btrim(regexp_replace(regexp_replace(NEW.referred_by, '[\u200B\u200C\u200D\uFEFF\u00A0]', ' ', 'g'), '\s+', ' ', 'g')), '');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_normalize_referred_by ON public.users;
CREATE TRIGGER users_normalize_referred_by
BEFORE INSERT OR UPDATE OF referred_by ON public.users
FOR EACH ROW EXECUTE FUNCTION public.normalize_referred_by();

-- 3) Make lookups whitespace-tolerant
CREATE OR REPLACE FUNCTION public.get_my_referrals()
RETURNS TABLE(id uuid, username text, city text, state text, created_at timestamp with time zone, profile_photo text, banner_photo text, front_page_photo text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT u.id, u.username, u.city, u.state, u.created_at, u.profile_photo, u.banner_photo, u.front_page_photo
  FROM public.users u
  WHERE auth.uid() IS NOT NULL
    AND lower(btrim(coalesce(u.referred_by, ''))) = lower(btrim(coalesce(public.get_my_username(), '')))
    AND btrim(coalesce(public.get_my_username(), '')) <> '';
$function$;

CREATE OR REPLACE FUNCTION public.get_my_referrals_count()
RETURNS bigint
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT count(*)::bigint
  FROM public.users u
  WHERE auth.uid() IS NOT NULL
    AND lower(btrim(coalesce(u.referred_by, ''))) = lower(btrim(coalesce(public.get_my_username(), '')))
    AND btrim(coalesce(public.get_my_username(), '')) <> '';
$function$;