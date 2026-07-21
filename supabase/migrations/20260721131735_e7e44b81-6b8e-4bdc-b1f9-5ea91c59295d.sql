GRANT ALL ON public.rental_bookings TO service_role;

ALTER TABLE public.rental_bookings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'rental_bookings'
      AND policyname = 'Service role can insert bookings'
  ) THEN
    CREATE POLICY "Service role can insert bookings"
    ON public.rental_bookings
    FOR INSERT
    TO service_role
    WITH CHECK (true);
  END IF;
END $$;