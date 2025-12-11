-- Create a function to get Diamond Plus member count (safe to expose publicly)
CREATE OR REPLACE FUNCTION public.get_diamond_plus_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*)::integer 
  FROM users 
  WHERE diamond_plus_active = true 
  AND user_type IN ('exotic', 'stripper');
$$;

-- Grant execute to anon and authenticated users
GRANT EXECUTE ON FUNCTION public.get_diamond_plus_count() TO anon;
GRANT EXECUTE ON FUNCTION public.get_diamond_plus_count() TO authenticated;