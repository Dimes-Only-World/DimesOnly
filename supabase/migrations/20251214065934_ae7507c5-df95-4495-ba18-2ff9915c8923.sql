-- Add anon read policy for events table
CREATE POLICY "Allow anon to read events"
ON public.events
FOR SELECT
TO anon
USING (true);