-- Function to check Silver+ availability
CREATE OR REPLACE FUNCTION public.check_silver_plus_availability()
RETURNS TABLE (
  available BOOLEAN,
  current_count INTEGER,
  max_count INTEGER,
  remaining INTEGER
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    (SELECT COUNT(*) < 3000 FROM users WHERE silver_plus_active = true) as available,
    (SELECT COUNT(*) FROM users WHERE silver_plus_active = true) as current_count,
    3000 as max_count,
    GREATEST(0, 3000 - (SELECT COUNT(*) FROM users WHERE silver_plus_active = true)) as remaining
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_silver_plus_availability() TO authenticated;
