-- Fix search_path warning for the function
CREATE OR REPLACE FUNCTION public.get_diamond_plus_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COUNT(*)::integer 
  FROM users 
  WHERE diamond_plus_active = true 
  AND user_type IN ('exotic', 'stripper');
$$;