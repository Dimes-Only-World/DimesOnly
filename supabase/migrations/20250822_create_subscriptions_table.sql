-- Create subscriptions table to track PayPal subscriptions and split payment cycles
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  subscription_id text not null unique,
  tier text not null, -- silver | gold | diamond
  cadence text not null, -- monthly | yearly
  billing_option text, -- full | split (only for diamond yearly)
  cycles_paid integer not null default 0,
  total_cycles integer, -- e.g., 3 for diamond yearly split
  status text, -- active | suspended | cancelled | expired
  next_billing_time timestamptz,
  membership_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_subscriptions_subscription_id on public.subscriptions(subscription_id);

-- Updated at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();
