-- Fix commission_payouts RLS policy - remove overly permissive "System can manage" policy
-- and replace with service_role-only policy

-- Drop the problematic policy that allows ALL users to do ALL operations
DROP POLICY IF EXISTS "System can manage commission payouts" ON commission_payouts;

-- Create a proper service-role-only policy for system operations (INSERT, UPDATE, DELETE)
-- Note: service_role bypasses RLS, so this policy is for documentation and to prevent
-- anonymous/authenticated users from modifying commission records directly
CREATE POLICY "Only service role can modify commissions"
ON commission_payouts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Keep the existing user SELECT policy (users can only view their own commissions)
-- This policy should already exist: "Users can view their own commission payouts"