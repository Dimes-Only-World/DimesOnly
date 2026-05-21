
-- 1) user_roles: remove anon read; allow users to view only their own role; admins can view all
DROP POLICY IF EXISTS user_roles_select_anon ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_anon" ON public.user_roles;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'user_roles_select_own' AND polrelid = 'public.user_roles'::regclass) THEN
    CREATE POLICY user_roles_select_own ON public.user_roles
      FOR SELECT TO authenticated
      USING (user_id = auth.uid() OR public.is_admin());
  END IF;
END $$;

-- 2) user_events: lock down UPDATE/DELETE to admins only
DROP POLICY IF EXISTS "Admin can delete event selections" ON public.user_events;
DROP POLICY IF EXISTS "Allow admin updates on user_events" ON public.user_events;

CREATE POLICY user_events_admin_update ON public.user_events
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY user_events_admin_delete ON public.user_events
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- 3) payout_requests: add RESTRICTIVE policies so only service_role can UPDATE/DELETE
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'payout_requests_restrict_update' AND polrelid = 'public.payout_requests'::regclass) THEN
    CREATE POLICY payout_requests_restrict_update ON public.payout_requests
      AS RESTRICTIVE
      FOR UPDATE TO public
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'payout_requests_restrict_delete' AND polrelid = 'public.payout_requests'::regclass) THEN
    CREATE POLICY payout_requests_restrict_delete ON public.payout_requests
      AS RESTRICTIVE
      FOR DELETE TO public
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- 4) Harden update_user_silver_plus
CREATE OR REPLACE FUNCTION public.update_user_silver_plus(
  user_id_param UUID,
  payment_id_param UUID,
  membership_number_param INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  max_memberships INTEGER := 300;
BEGIN
  -- Caller must own the row OR be admin OR be invoked from service_role
  IF NOT (
    auth.role() = 'service_role'
    OR (auth.uid() IS NOT NULL AND auth.uid() = user_id_param)
    OR public.is_admin()
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT COUNT(*) INTO current_count FROM users WHERE silver_plus_active = true;
  IF current_count >= max_memberships THEN
    RETURN jsonb_build_object('success', false, 'error', 'Maximum number of Silver+ memberships reached');
  END IF;

  UPDATE users
  SET silver_plus_active = true,
      silver_plus_joined_at = NOW(),
      silver_plus_payment_id = payment_id_param,
      silver_plus_membership_number = membership_number_param,
      membership_tier = 'silver_plus',
      membership_type = 'Silver+',
      updated_at = NOW()
  WHERE id = user_id_param;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'current_count', current_count + 1,
    'remaining', GREATEST(0, max_memberships - (current_count + 1))
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_user_silver_plus(UUID, UUID, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_user_silver_plus(UUID, UUID, INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_user_silver_plus(UUID, UUID, INTEGER) TO authenticated, service_role;
