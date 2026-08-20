create or replace function public.event_attendance_counts(p_event_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with regs as (
    select ue.user_id, ue.ticket_quantity, ue.payment_status, u.user_type, u.gender,
           u.silver_plus_active, u.diamond_plus_active, u.business_owner_elite_active
    from public.user_events ue
    left join public.users u on u.id = ue.user_id
    where ue.event_id = p_event_id
  ),
  freeregs as (
    select * from regs where payment_status = 'free'
  )
  select jsonb_build_object(
    'total_attendees', coalesce((select sum(coalesce(ticket_quantity, 1)) from regs), 0),
    'registration_count', (select count(*) from regs),
    'used', jsonb_build_object(
      'strippers', (select count(*) from freeregs where user_type = 'stripper'),
      'exotics',   (select count(*) from freeregs where user_type = 'exotic'),
      'males',     (select count(*) from freeregs where user_type <> 'stripper' and user_type <> 'exotic' and (user_type = 'male' or gender = 'male')),
      'females',   (select count(*) from freeregs where user_type <> 'stripper' and user_type <> 'exotic' and (user_type in ('female','normal') or gender = 'female') and not (user_type = 'male' or gender = 'male')),
      'normal',    (select count(*) from freeregs where coalesce(user_type,'') not in ('stripper','exotic','male','female','normal') and coalesce(gender,'') not in ('male','female')),
      'dimes',     (select count(*) from freeregs where user_type in ('stripper','exotic')),
      'normals',   (select count(*) from freeregs where coalesce(user_type,'') not in ('stripper','exotic')),
      'plus',      (select count(*) from freeregs where silver_plus_active or diamond_plus_active or business_owner_elite_active),
      'silver_plus',  (select count(*) from freeregs where silver_plus_active),
      'diamond_plus', (select count(*) from freeregs where diamond_plus_active),
      'elite_plus',   (select count(*) from freeregs where business_owner_elite_active)
    )
  )
$$;

grant execute on function public.event_attendance_counts(uuid) to anon, authenticated, service_role;