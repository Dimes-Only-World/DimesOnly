-- Fix pay periods from weekly to bi-monthly (1st-15th, 16th-end of month)
-- Safe approach: aggregate into bi-monthly periods first to avoid unique conflicts,
-- then replace the original rows in a single transaction.
--
-- HOW TO CHANGE DATE WINDOW:
--   Edit the d_start and d_end values in the date_window CTE below.
--   By default this normalizes from 2025-01-01 through 2030-12-31.

BEGIN;

-- First, let's see what we have
-- 1) Inspect current rows (optional)
-- SELECT id, user_id, week_start, week_end, amount
-- FROM weekly_earnings 
-- WHERE week_start BETWEEN '2025-08-01' AND '2025-09-30'
-- ORDER BY user_id, week_start;

-- 2) Define the window you want to normalize (adjust as needed)
-- Default: normalize from 2025-01-01 through 2030-12-31
-- Build final periods into a temp table so we can safely delete then insert
CREATE TEMP TABLE tmp_final_periods ON COMMIT DROP AS
WITH date_window AS (
  SELECT 
    DATE '2025-01-01' AS d_start,
    DATE '2030-12-31' AS d_end
)
SELECT 
  we.user_id,
  /* week_start (period start) */
  CASE 
    WHEN EXTRACT(DAY FROM we.week_start) <= 15 
      THEN date_trunc('month', we.week_start)::date
    ELSE 
      (date_trunc('month', we.week_start)::date + INTERVAL '15 days')::date
  END AS week_start,
  /* week_end (period end) */
  CASE 
    WHEN EXTRACT(DAY FROM we.week_start) <= 15 
      THEN (date_trunc('month', we.week_start)::date + INTERVAL '14 days')::date  -- 15th
    ELSE 
      (date_trunc('month', we.week_start)::date + INTERVAL '1 month' - INTERVAL '1 day')::date  -- end of month
  END AS week_end,
  SUM(we.amount) AS amount,
  SUM(we.tip_earnings) AS tip_earnings,
  SUM(we.referral_earnings) AS referral_earnings,
  SUM(we.bonus_earnings) AS bonus_earnings
FROM weekly_earnings we, date_window w
WHERE we.week_start BETWEEN w.d_start AND w.d_end
GROUP BY we.user_id,
         CASE WHEN EXTRACT(DAY FROM we.week_start) <= 15 THEN date_trunc('month', we.week_start)::date ELSE (date_trunc('month', we.week_start)::date + INTERVAL '15 days')::date END,
         CASE WHEN EXTRACT(DAY FROM we.week_start) <= 15 THEN (date_trunc('month', we.week_start)::date + INTERVAL '14 days')::date ELSE (date_trunc('month', we.week_start)::date + INTERVAL '1 month' - INTERVAL '1 day')::date END;

-- Delete originals in window
WITH date_window AS (
  SELECT 
    DATE '2025-01-01' AS d_start,
    DATE '2030-12-31' AS d_end
)
DELETE FROM weekly_earnings we
USING date_window w
WHERE we.week_start BETWEEN w.d_start AND w.d_end;

-- Insert consolidated rows
INSERT INTO weekly_earnings (
  id, user_id, week_start, week_end, amount, tip_earnings, referral_earnings, bonus_earnings, created_at, updated_at
)
SELECT 
  gen_random_uuid(),
  f.user_id,
  f.week_start,
  f.week_end,
  f.amount,
  f.tip_earnings,
  f.referral_earnings,
  f.bonus_earnings,
  now(),
  now()
FROM tmp_final_periods f;

COMMIT;

-- Verify (optional)
-- SELECT user_id, week_start, week_end, amount
-- FROM weekly_earnings 
-- WHERE week_start BETWEEN '2025-08-01' AND '2025-09-30'
-- ORDER BY user_id, week_start;
