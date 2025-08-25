-- Indexes to speed up lookups and enforce uniqueness where appropriate
begin;

-- Ensure fast lookups by user
create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);

-- Enforce uniqueness of subscription_id (some migrations may already set this at app layer)
create unique index if not exists ux_subscriptions_subscription_id on public.subscriptions(subscription_id);

commit;
