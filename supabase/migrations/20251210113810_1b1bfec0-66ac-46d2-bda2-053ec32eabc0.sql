-- Remove dangerous "System can manage" policies that allow unrestricted access
-- These policies have qual:true which allows ANY user (including anonymous) to access all data

-- Drop the dangerous system policies on membership_upgrades
DROP POLICY IF EXISTS "System can manage membership upgrades" ON public.membership_upgrades;

-- Drop the dangerous system policies on tips_transactions
DROP POLICY IF EXISTS "System can manage tip transactions" ON public.tips_transactions;

-- The user-scoped policies are correctly configured and will remain:
-- membership_upgrades: "Users can view own membership upgrades", "Users can insert own membership upgrades"
-- tips_transactions: Has proper user-scoped policies

-- Note: Edge functions that need admin access should use SUPABASE_SERVICE_ROLE_KEY
-- which bypasses RLS entirely, making these "System" policies unnecessary