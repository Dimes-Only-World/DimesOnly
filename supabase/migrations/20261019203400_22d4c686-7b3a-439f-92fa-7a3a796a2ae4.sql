-- 1. Renter bookings: only the server (booking function) may create or change bookings
DROP POLICY IF EXISTS "Renters create their own bookings" ON public.rental_bookings;
DROP POLICY IF EXISTS "Renters cancel their own pending bookings" ON public.rental_bookings;
CREATE POLICY "Admins update bookings" ON public.rental_bookings FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
REVOKE INSERT, UPDATE ON public.rental_bookings FROM anon;

-- 2. Tip audit view exposed every tipper/performer and amounts to the public
ALTER VIEW public.v_tip_allocation_audit SET (security_invoker = true);
REVOKE ALL ON public.v_tip_allocation_audit FROM anon, authenticated;

-- 3. Money-changing functions callable by anyone: server-only now
REVOKE EXECUTE ON FUNCTION public.increment_referral_earnings(uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_referral_fees(uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_tips_earned(uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_weekly_referral_earnings(uuid, date, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_or_create_weekly_earnings(uuid, date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_referral_payouts(uuid, uuid, text, numeric, numeric, numeric, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_stock(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_user_silver_plus(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.api_jackpot_close_and_open(timestamptz, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.api_jackpot_run_draw(timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.jackpot_run_draw(timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.jackpot_run_draw(character, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.jackpot_gen_code() FROM PUBLIC, anon, authenticated;

-- 4. Forced jackpot draw: admins only
CREATE OR REPLACE FUNCTION public.api_jackpot_run_draw_force(p_force_code text, p_now timestamp with time zone DEFAULT now())
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'Admins only');
  end if;
  if p_force_code is null or p_force_code !~ '^[A-Z]{5}$' then
    return jsonb_build_object('ok', false, 'error', 'Invalid code format');
  end if;
  perform set_config('jackpot.force_code', upper(p_force_code), true);
  return public.jackpot_run_draw(p_now);
exception
  when others then
    perform set_config('jackpot.force_code', '', true);
    raise;
end;
$function$;
REVOKE EXECUTE ON FUNCTION public.api_jackpot_run_draw_force(text, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.api_jackpot_run_draw_force(text, timestamptz) TO authenticated, service_role;