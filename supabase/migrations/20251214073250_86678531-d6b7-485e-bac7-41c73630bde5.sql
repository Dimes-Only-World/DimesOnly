-- Drop the restrictive insert policy and allow inserts from anon/authenticated for admin usage
DROP POLICY IF EXISTS "Events can be inserted by admins" ON events;

-- Create a permissive insert policy for event creation
CREATE POLICY "Allow event creation"
ON events FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Also ensure update and delete work for admin
DROP POLICY IF EXISTS "Events can be updated by admins" ON events;

CREATE POLICY "Allow event updates"
ON events FOR UPDATE
TO anon, authenticated
USING (true);

CREATE POLICY "Allow event deletion"
ON events FOR DELETE
TO anon, authenticated
USING (true);