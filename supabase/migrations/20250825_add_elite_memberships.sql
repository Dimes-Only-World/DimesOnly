-- Elite memberships schema
-- Creates table to track Elite seats, progress, and lifetime status
-- Seats are capped at 50. Seats are considered taken when status is monthly_active or lifetime.

begin;

-- Status values: monthly_active | lifetime | canceled
create table if not exists public.elite_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null check (status in ('monthly_active','lifetime','canceled')),
  months_paid_count integer not null default 0,
  started_at timestamptz default now(),
  last_payment_at timestamptz,
  lifetime_granted_at timestamptz,
  seat_number integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists t_elite_memberships_set_updated_at on public.elite_memberships;
create trigger t_elite_memberships_set_updated_at
before update on public.elite_memberships
for each row execute function public.set_updated_at();

-- Only one active (monthly_active or lifetime) elite per user
create unique index if not exists uq_elite_user_active
on public.elite_memberships (user_id)
where status in ('monthly_active','lifetime');

-- Seat number must be unique among active/lifetime rows; allow NULL when canceled
create unique index if not exists uq_elite_seat_active
on public.elite_memberships (seat_number)
where status in ('monthly_active','lifetime');

-- Fast lookups
create index if not exists idx_elite_status on public.elite_memberships(status);
create index if not exists idx_elite_user on public.elite_memberships(user_id);

-- Seat stats view: seats_max fixed at 50
create or replace view public.elite_seat_stats as
select
  50::int as seats_max,
  count(*) filter (where status in ('monthly_active','lifetime'))::int as seats_taken,
  (50 - count(*) filter (where status in ('monthly_active','lifetime')))::int as seats_available
from public.elite_memberships;

commit;
