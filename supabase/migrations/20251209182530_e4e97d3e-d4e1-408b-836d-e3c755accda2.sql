-- =====================================================
-- FIX 1: Remove dangerous RLS policies from users table
-- =====================================================

-- Drop policies that allow public/anonymous access
DROP POLICY IF EXISTS "Allow public read access" ON users;
DROP POLICY IF EXISTS "Public profile info viewable" ON users;
DROP POLICY IF EXISTS "anon_select" ON users;
DROP POLICY IF EXISTS "Allow public read access for user counts" ON users;
DROP POLICY IF EXISTS "Allow anonymous insert on users" ON users;
DROP POLICY IF EXISTS "Allow insert on users" ON users;

-- Keep these good policies (they already exist, just documenting):
-- "Users can view own profile" - qual: (auth.uid() = id)
-- "Users can update own profile" - qual: (auth.uid() = id)
-- "Allow authenticated select on users" - for authenticated users
-- "Allow authenticated update on users" - for authenticated users

-- =====================================================
-- FIX 2: Recreate views with SECURITY INVOKER
-- =====================================================

-- Drop and recreate elite_seat_stats with security_invoker
DROP VIEW IF EXISTS elite_seat_stats;
CREATE VIEW elite_seat_stats
WITH (security_invoker = true)
AS SELECT 
    50 AS seats_max,
    (count(*) FILTER (WHERE (status = ANY (ARRAY['monthly_active'::text, 'lifetime'::text]))))::integer AS seats_taken,
    ((50 - count(*) FILTER (WHERE (status = ANY (ARRAY['monthly_active'::text, 'lifetime'::text])))))::integer AS seats_available
FROM elite_memberships;

-- Drop and recreate v_jackpot_current_pool with security_invoker
DROP VIEW IF EXISTS v_jackpot_current_pool;
CREATE VIEW v_jackpot_current_pool
WITH (security_invoker = true)
AS SELECT 
    id AS pool_id,
    status,
    current_amount,
    rollover_amount,
    (current_amount + rollover_amount) AS total,
    period_start,
    period_end,
    created_at
FROM jackpot_pools
ORDER BY created_at DESC
LIMIT 1;

-- Drop and recreate v_jackpot_user_tickets with security_invoker
DROP VIEW IF EXISTS v_jackpot_user_tickets;
CREATE VIEW v_jackpot_user_tickets
WITH (security_invoker = true)
AS WITH p AS (
    SELECT jackpot_pools.id
    FROM jackpot_pools
    ORDER BY jackpot_pools.created_at DESC
    LIMIT 1
)
SELECT 
    t.tipper_id AS user_id,
    count(*) AS tickets
FROM jackpot_tickets t, p
WHERE (t.pool_id = p.id)
GROUP BY t.tipper_id;

-- Drop and recreate v_jackpot_active_pool with security_invoker
DROP VIEW IF EXISTS v_jackpot_active_pool;
CREATE VIEW v_jackpot_active_pool
WITH (security_invoker = true)
AS WITH cfg AS (
    SELECT jackpot_config.id,
        jackpot_config.active,
        jackpot_config.jackpot_percent,
        jackpot_config.jackpot_base,
        jackpot_config.created_at
    FROM jackpot_config
    WHERE jackpot_config.active
    ORDER BY jackpot_config.created_at DESC
    LIMIT 1
), p AS (
    SELECT jackpot_pools.id,
        jackpot_pools.status,
        jackpot_pools.period_start,
        jackpot_pools.period_end,
        jackpot_pools.current_amount,
        jackpot_pools.rollover_amount,
        jackpot_pools.max_tickets,
        jackpot_pools.sold_out_at,
        jackpot_pools.sales_resume_at,
        jackpot_pools.guaranteed_draw
    FROM jackpot_pools
    WHERE (jackpot_pools.status = ANY ('{open,sold_out}'::text[]))
    ORDER BY jackpot_pools.created_at DESC
    LIMIT 1
), tt AS (
    SELECT sum(t.tip_amount) AS gross
    FROM (tips_transactions t
        CROSS JOIN p p1)
    WHERE ((t.payment_status = 'completed'::text) AND (t.completed_at >= p1.period_start) AND ((p1.period_end IS NULL) OR (t.completed_at < p1.period_end)))
), tk AS (
    SELECT (count(*))::numeric AS gross_from_tickets
    FROM (jackpot_tickets j
        CROSS JOIN p p1)
    WHERE (j.pool_id = p1.id)
), base AS (
    SELECT COALESCE(( SELECT tt.gross FROM tt), ( SELECT tk.gross_from_tickets FROM tk), (0)::numeric) AS base_gross
)
SELECT 
    id AS pool_id,
    status,
    COALESCE(current_amount, (COALESCE((( SELECT cfg.jackpot_percent FROM cfg) * ( SELECT base.base_gross FROM base)), (0)::numeric) + rollover_amount)) AS total,
    current_amount,
    rollover_amount,
    period_start,
    period_end,
    max_tickets,
    sold_out_at,
    sales_resume_at,
    guaranteed_draw
FROM p;

-- Drop and recreate v_jackpot_latest_winners with security_invoker
DROP VIEW IF EXISTS v_jackpot_latest_winners;
CREATE VIEW v_jackpot_latest_winners
WITH (security_invoker = true)
AS SELECT 
    jw.draw_id,
    jd.drawn_code,
    jd.executed_at,
    jw.user_id,
    jw.role,
    jw.place,
    jw.percentage,
    jw.amount,
    jw.status
FROM (jackpot_winners jw
    JOIN jackpot_draws jd ON ((jd.id = jw.draw_id)));