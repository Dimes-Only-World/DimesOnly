-- =============================================
-- COMPREHENSIVE RLS SECURITY FIX
-- Enable RLS on all unprotected tables
-- =============================================

-- 1. USERS TABLE (Critical - contains PII and password hashes)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.users FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
USING (auth.uid() = id);

-- Allow viewing public profile info (username, profile_photo, etc.) for directory
CREATE POLICY "Public profile info viewable"
ON public.users FOR SELECT
USING (true);

-- 2. DIRECT_MESSAGES TABLE
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- 3. TIPS TABLE
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tips they sent or received"
ON public.tips FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM users WHERE username = tipped_username AND id = auth.uid()) OR
  EXISTS (SELECT 1 FROM users WHERE username = tipper_username AND id = auth.uid())
);

CREATE POLICY "System can insert tips"
ON public.tips FOR INSERT
WITH CHECK (true);

-- 4. TIPS_TRANSACTIONS TABLE
ALTER TABLE public.tips_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tip transactions"
ON public.tips_transactions FOR SELECT
USING (
  auth.uid() = tipper_user_id OR
  auth.uid() = tipped_user_id
);

CREATE POLICY "System can manage tip transactions"
ON public.tips_transactions FOR ALL
USING (true);

-- 5. NOTIFICATIONS TABLE (already has policies, just enable RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 6. MESSAGES TABLE (already has policies, just enable RLS)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 7. ELITE_MEMBERSHIPS TABLE
ALTER TABLE public.elite_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own elite membership"
ON public.elite_memberships FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can manage elite memberships"
ON public.elite_memberships FOR ALL
USING (true);

-- 8. MEMBERSHIP_UPGRADES TABLE
ALTER TABLE public.membership_upgrades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own membership upgrades"
ON public.membership_upgrades FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own membership upgrades"
ON public.membership_upgrades FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can manage membership upgrades"
ON public.membership_upgrades FOR ALL
USING (true);

-- 9. JACKPOT_DRAWS TABLE
ALTER TABLE public.jackpot_draws ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view jackpot draws"
ON public.jackpot_draws FOR SELECT
USING (true);

-- 10. JACKPOT_CONFIGS TABLE
ALTER TABLE public.jackpot_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view jackpot configs"
ON public.jackpot_configs FOR SELECT
USING (true);

-- 11. JACKPOT_LEDGER TABLE
ALTER TABLE public.jackpot_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ledger entries"
ON public.jackpot_ledger FOR SELECT
USING (
  auth.uid() = tipper_id OR
  auth.uid() = dime_id OR
  auth.uid() = referred_dime_id
);

-- 12. JACKPOT_CONFIG TABLE (singular)
ALTER TABLE public.jackpot_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view jackpot config"
ON public.jackpot_config FOR SELECT
USING (true);

-- 13. MEDIA_COMMENTS TABLE
ALTER TABLE public.media_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view media comments"
ON public.media_comments FOR SELECT
USING (true);

CREATE POLICY "Users can insert own comments"
ON public.media_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
ON public.media_comments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
ON public.media_comments FOR DELETE
USING (auth.uid() = user_id);

-- 14. MEDIA_REPLIES TABLE
ALTER TABLE public.media_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view media replies"
ON public.media_replies FOR SELECT
USING (true);

CREATE POLICY "Users can insert own replies"
ON public.media_replies FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own replies"
ON public.media_replies FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own replies"
ON public.media_replies FOR DELETE
USING (auth.uid() = user_id);

-- 15. CONTENT_ACCESS_PAYMENTS TABLE
ALTER TABLE public.content_access_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own content access payments"
ON public.content_access_payments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can manage content access payments"
ON public.content_access_payments FOR ALL
USING (true);

-- 16. INSTALLMENT_PAYMENTS TABLE
ALTER TABLE public.installment_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own installment payments"
ON public.installment_payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM membership_upgrades mu 
    WHERE mu.id = membership_upgrade_id 
    AND mu.user_id = auth.uid()
  )
);

CREATE POLICY "System can manage installment payments"
ON public.installment_payments FOR ALL
USING (true);

-- 17. PAYOUT_REQUESTS TABLE
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payout requests"
ON public.payout_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payout requests"
ON public.payout_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payout requests"
ON public.payout_requests FOR UPDATE
USING (auth.uid() = user_id);

-- 18. QUARTERLY_REQUIREMENTS TABLE
ALTER TABLE public.quarterly_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quarterly requirements"
ON public.quarterly_requirements FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can manage quarterly requirements"
ON public.quarterly_requirements FOR ALL
USING (true);

-- 19. MEMBERSHIP_LIMITS TABLE (config table - read-only for users)
ALTER TABLE public.membership_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view membership limits"
ON public.membership_limits FOR SELECT
USING (true);

-- 20. SILVER_PLUS_COUNTER TABLE (config table - read-only for users)
ALTER TABLE public.silver_plus_counter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view silver plus counter"
ON public.silver_plus_counter FOR SELECT
USING (true);

-- 21. PAYPAL_WEBHOOK_EVENTS TABLE (system table - no user access)
ALTER TABLE public.paypal_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System only access to webhook events"
ON public.paypal_webhook_events FOR ALL
USING (false);

-- 22. _VIEW_BACKUP TABLE (system table)
ALTER TABLE public._view_backup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System only access to view backup"
ON public._view_backup FOR ALL
USING (false);