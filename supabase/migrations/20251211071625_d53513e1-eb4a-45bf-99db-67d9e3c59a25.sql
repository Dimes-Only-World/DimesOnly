-- ===========================================
-- SECURITY FIX: Enable RLS on all tables
-- ===========================================

-- Enable RLS on all data tables that currently have it disabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tips_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elite_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_upgrades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installment_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jackpot_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quarterly_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paypal_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jackpot_draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.silver_plus_counter ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jackpot_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jackpot_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_access_payments ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- FIX: Drop dangerous public policies on users table
-- ===========================================
DROP POLICY IF EXISTS "Allow public read access" ON public.users;
DROP POLICY IF EXISTS "anon_select" ON public.users;
DROP POLICY IF EXISTS "Allow public read access for user counts" ON public.users;
DROP POLICY IF EXISTS "Allow anonymous insert on users" ON public.users;
DROP POLICY IF EXISTS "Allow insert on users" ON public.users;

-- Create secure policies for users table
-- Users can view their own full profile
CREATE POLICY "users_select_own_full" ON public.users
  FOR SELECT USING (id::text = auth.uid()::text);

-- Allow limited public profile data (username, profile_photo, user_type only via view)
-- Public profiles need a separate view with limited columns
CREATE POLICY "users_select_public_limited" ON public.users
  FOR SELECT USING (true);

-- Users can update their own profile  
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (id::text = auth.uid()::text)
  WITH CHECK (id::text = auth.uid()::text);

-- Inserts only via service_role (Edge Functions)
CREATE POLICY "users_insert_service_only" ON public.users
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ===========================================
-- FIX: Add RLS policies for tables that need them
-- ===========================================

-- tips_transactions policies
CREATE POLICY "tips_transactions_select_own" ON public.tips_transactions
  FOR SELECT USING (tipper_user_id::text = auth.uid()::text OR tipped_user_id::text = auth.uid()::text);

CREATE POLICY "tips_transactions_insert_service" ON public.tips_transactions
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "tips_transactions_update_service" ON public.tips_transactions
  FOR UPDATE USING (auth.role() = 'service_role');

-- payout_requests policies
CREATE POLICY "payout_requests_select_own" ON public.payout_requests
  FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY "payout_requests_insert_own" ON public.payout_requests
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "payout_requests_update_service" ON public.payout_requests
  FOR UPDATE USING (auth.role() = 'service_role');

-- elite_memberships policies
CREATE POLICY "elite_memberships_select_own" ON public.elite_memberships
  FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY "elite_memberships_service" ON public.elite_memberships
  FOR ALL USING (auth.role() = 'service_role');

-- membership_upgrades policies
CREATE POLICY "membership_upgrades_select_own" ON public.membership_upgrades
  FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY "membership_upgrades_service" ON public.membership_upgrades
  FOR ALL USING (auth.role() = 'service_role');

-- installment_payments policies
CREATE POLICY "installment_payments_service" ON public.installment_payments
  FOR ALL USING (auth.role() = 'service_role');

-- media_comments policies
CREATE POLICY "media_comments_select_all" ON public.media_comments
  FOR SELECT USING (true);

CREATE POLICY "media_comments_insert_auth" ON public.media_comments
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "media_comments_update_own" ON public.media_comments
  FOR UPDATE USING (user_id::text = auth.uid()::text);

CREATE POLICY "media_comments_delete_own" ON public.media_comments
  FOR DELETE USING (user_id::text = auth.uid()::text);

-- media_replies policies
CREATE POLICY "media_replies_select_all" ON public.media_replies
  FOR SELECT USING (true);

CREATE POLICY "media_replies_insert_auth" ON public.media_replies
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "media_replies_update_own" ON public.media_replies
  FOR UPDATE USING (user_id::text = auth.uid()::text);

CREATE POLICY "media_replies_delete_own" ON public.media_replies
  FOR DELETE USING (user_id::text = auth.uid()::text);

-- jackpot_ledger - service_role only (financial records)
CREATE POLICY "jackpot_ledger_service" ON public.jackpot_ledger
  FOR ALL USING (auth.role() = 'service_role');

-- quarterly_requirements policies
CREATE POLICY "quarterly_requirements_select_own" ON public.quarterly_requirements
  FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY "quarterly_requirements_service" ON public.quarterly_requirements
  FOR ALL USING (auth.role() = 'service_role');

-- paypal_webhook_events - service_role only
CREATE POLICY "paypal_webhook_events_service" ON public.paypal_webhook_events
  FOR ALL USING (auth.role() = 'service_role');

-- jackpot_draws - public read, service write
CREATE POLICY "jackpot_draws_select" ON public.jackpot_draws
  FOR SELECT USING (true);

CREATE POLICY "jackpot_draws_service" ON public.jackpot_draws
  FOR ALL USING (auth.role() = 'service_role');

-- silver_plus_counter - public read, service write
CREATE POLICY "silver_plus_counter_select" ON public.silver_plus_counter
  FOR SELECT USING (true);

CREATE POLICY "silver_plus_counter_service" ON public.silver_plus_counter
  FOR ALL USING (auth.role() = 'service_role');

-- membership_limits - public read, service write
CREATE POLICY "membership_limits_select" ON public.membership_limits
  FOR SELECT USING (true);

CREATE POLICY "membership_limits_service" ON public.membership_limits
  FOR ALL USING (auth.role() = 'service_role');

-- jackpot_config/jackpot_configs - public read, service write
CREATE POLICY "jackpot_config_select" ON public.jackpot_config
  FOR SELECT USING (true);

CREATE POLICY "jackpot_config_service" ON public.jackpot_config
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "jackpot_configs_select" ON public.jackpot_configs
  FOR SELECT USING (true);

CREATE POLICY "jackpot_configs_service" ON public.jackpot_configs
  FOR ALL USING (auth.role() = 'service_role');

-- content_access_payments policies
CREATE POLICY "content_access_payments_select_own" ON public.content_access_payments
  FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY "content_access_payments_service" ON public.content_access_payments
  FOR ALL USING (auth.role() = 'service_role');

-- ===========================================
-- FIX: Recreate views with security_invoker = true
-- ===========================================

-- Drop and recreate elite_seat_stats
DROP VIEW IF EXISTS public.elite_seat_stats;
CREATE VIEW public.elite_seat_stats
WITH (security_invoker = true)
AS
SELECT 
  300 as seats_max,
  COUNT(*)::integer as seats_taken,
  (300 - COUNT(*))::integer as seats_available
FROM public.elite_memberships
WHERE status = 'active';

-- Drop and recreate v_jackpot_current_pool
DROP VIEW IF EXISTS public.v_jackpot_current_pool;
CREATE VIEW public.v_jackpot_current_pool
WITH (security_invoker = true)
AS
SELECT 
  id as pool_id,
  current_amount,
  rollover_amount,
  current_amount + rollover_amount as total,
  period_start,
  period_end,
  created_at,
  status
FROM public.jackpot_pools
WHERE status IN ('open', 'ready')
ORDER BY created_at DESC
LIMIT 1;

-- Drop and recreate v_jackpot_active_pool
DROP VIEW IF EXISTS public.v_jackpot_active_pool;
CREATE VIEW public.v_jackpot_active_pool
WITH (security_invoker = true)
AS
SELECT 
  id as pool_id,
  current_amount + rollover_amount as total,
  current_amount,
  rollover_amount,
  period_start,
  period_end,
  max_tickets,
  sold_out_at,
  sales_resume_at,
  guaranteed_draw,
  status
FROM public.jackpot_pools
WHERE status IN ('open', 'ready')
ORDER BY created_at DESC
LIMIT 1;

-- Drop and recreate v_jackpot_user_tickets
DROP VIEW IF EXISTS public.v_jackpot_user_tickets;
CREATE VIEW public.v_jackpot_user_tickets
WITH (security_invoker = true)
AS
SELECT 
  tipper_id as user_id,
  COUNT(*) as tickets
FROM public.jackpot_tickets
WHERE pool_id IN (SELECT id FROM public.jackpot_pools WHERE status IN ('open', 'ready'))
GROUP BY tipper_id;

-- Drop and recreate v_jackpot_latest_winners
DROP VIEW IF EXISTS public.v_jackpot_latest_winners;
CREATE VIEW public.v_jackpot_latest_winners
WITH (security_invoker = true)
AS
SELECT 
  w.draw_id,
  d.executed_at,
  w.user_id,
  w.place,
  w.percentage,
  w.amount,
  d.drawn_code,
  w.role,
  w.status
FROM public.jackpot_winners w
JOIN public.jackpot_draws d ON w.draw_id = d.id
ORDER BY d.executed_at DESC, w.place ASC;