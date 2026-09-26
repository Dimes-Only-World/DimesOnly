-- Top 20 members ranked by the size of their money circle (number of referrals)
create or replace view public.v_top_money_circles
with (security_invoker = false) as
select
  u.id as user_id,
  u.username,
  u.profile_photo,
  count(r.id)::int as circle_size
from public.users u
join public.users r
  on r.referred_by is not null
 and lower(trim(r.referred_by)) = lower(trim(u.username))
where lower(trim(u.username)) <> 'company'
group by u.id, u.username, u.profile_photo, u.created_at
order by count(r.id) desc, u.created_at asc
limit 20;

grant select on public.v_top_money_circles to authenticated;
grant select on public.v_top_money_circles to service_role;
revoke select on public.v_top_money_circles from anon;
