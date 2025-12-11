-- Fix function search_path for all public functions that don't have it set
-- This prevents potential search_path injection attacks

ALTER FUNCTION public.api_jackpot_close_and_open(timestamptz, text) SET search_path = public;
ALTER FUNCTION public.api_jackpot_run_draw(timestamptz) SET search_path = public;
ALTER FUNCTION public.api_jackpot_run_draw_force(text, timestamptz) SET search_path = public;
ALTER FUNCTION public.assign_silver_plus_membership_number() SET search_path = public;
ALTER FUNCTION public.calculate_next_payout_date() SET search_path = public;
ALTER FUNCTION public.check_silver_plus_availability() SET search_path = public;
ALTER FUNCTION public.decrement_membership_count_on_user_delete() SET search_path = public;
ALTER FUNCTION public.delete_expired_notifications() SET search_path = public;
ALTER FUNCTION public.get_or_create_weekly_earnings(uuid, date) SET search_path = public;
ALTER FUNCTION public.increment_membership_count(varchar, varchar) SET search_path = public;
ALTER FUNCTION public.increment_referral_earnings(uuid, numeric) SET search_path = public;
ALTER FUNCTION public.increment_weekly_referral_earnings(uuid, date, numeric) SET search_path = public;
ALTER FUNCTION public.jackpot_gen_code() SET search_path = public;
ALTER FUNCTION public.jackpot_get_active_config_vals() SET search_path = public;
ALTER FUNCTION public.jackpot_get_or_open_pool(timestamptz) SET search_path = public;
ALTER FUNCTION public.jackpot_next_sales_start(timestamptz) SET search_path = public;
ALTER FUNCTION public.jackpot_next_saturday(timestamptz) SET search_path = public;
ALTER FUNCTION public.jackpot_run_draw(char, timestamptz) SET search_path = public;
ALTER FUNCTION public.jackpot_run_draw(timestamptz) SET search_path = public;
ALTER FUNCTION public.jackpot_run_draw_force(char, timestamptz) SET search_path = public;
ALTER FUNCTION public.jackpot_week_bounds(timestamptz) SET search_path = public;
ALTER FUNCTION public.no_duplicate_letters(text) SET search_path = public;
ALTER FUNCTION public.process_referral_payouts(uuid, uuid, text, numeric, numeric, numeric, numeric) SET search_path = public;
ALTER FUNCTION public.process_tip_jackpot(uuid, uuid, uuid, uuid, numeric) SET search_path = public;
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.trigger_delete_expired_notifications() SET search_path = public;
ALTER FUNCTION public.update_membership_updated_at() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.update_user_silver_plus(uuid, uuid, integer) SET search_path = public;
ALTER FUNCTION public.validate_payout_method_fields() SET search_path = public;