-- Add policy to allow authenticated users to read public profile data from other users
-- This is needed for directory listings, tip pages, rate pages, etc.
CREATE POLICY "public_user_profiles_read"
ON users
FOR SELECT
TO authenticated
USING (true);

-- Also allow anon users to see basic public profiles (for public pages)
CREATE POLICY "anon_public_profiles_read"
ON users
FOR SELECT
TO anon
USING (true);