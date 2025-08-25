-- Enable Row Level Security on subscriptions and restrict reads to the owning user

begin;

-- Ensure table exists (no-op if it does not; this migration assumes it does)
-- Enable RLS
alter table if exists public.subscriptions enable row level security;

-- Clean up old policies if they exist
drop policy if exists "Users can view own subscriptions" on public.subscriptions;

-- Allow authenticated users to read only their own rows
create policy "Users can view own subscriptions"
  on public.subscriptions
  for select
  to authenticated
  using (user_id = auth.uid());

-- Note:
-- We do NOT add insert/update policies for regular users.
-- Supabase Edge Functions run with the service_role key which bypasses RLS,
-- allowing our webhook to insert/update subscription rows securely.

commit;
