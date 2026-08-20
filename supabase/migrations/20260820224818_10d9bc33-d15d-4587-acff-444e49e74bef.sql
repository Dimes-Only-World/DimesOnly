CREATE OR REPLACE FUNCTION public.event_attendees_public(p_event_id uuid)
RETURNS TABLE(
  user_id uuid,
  username text,
  profile_photo text,
  user_type text,
  city text,
  state text,
  ticket_type text,
  ticket_quantity integer,
  guest_name text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    ue.user_id,
    coalesce(u.username, ue.username) as username,
    u.profile_photo,
    u.user_type,
    u.city,
    u.state,
    ue.ticket_type,
    coalesce(ue.ticket_quantity, 1) as ticket_quantity,
    ue.guest_name,
    ue.created_at
  FROM public.user_events ue
  LEFT JOIN public.users u ON u.id = ue.user_id
  WHERE ue.event_id = p_event_id
  ORDER BY ue.created_at DESC
  LIMIT 500;
$$;

GRANT EXECUTE ON FUNCTION public.event_attendees_public(uuid) TO anon, authenticated, service_role;