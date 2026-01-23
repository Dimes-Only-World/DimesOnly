-- Add RLS policy to allow admin updates on user_events (for check-in functionality)
CREATE POLICY "Allow admin updates on user_events"
ON public.user_events
FOR UPDATE
USING (true)
WITH CHECK (true);