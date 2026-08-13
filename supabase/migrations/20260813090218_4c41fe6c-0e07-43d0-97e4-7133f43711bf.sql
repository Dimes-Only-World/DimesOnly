CREATE OR REPLACE FUNCTION public.get_elite_plus_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.business_owner_elite_seats
  WHERE status IN ('active','paid','lifetime','installment');
$$;

GRANT EXECUTE ON FUNCTION public.get_elite_plus_count() TO anon, authenticated, service_role;