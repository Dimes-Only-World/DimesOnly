-- Create table to log PayPal webhook events and enforce idempotency
begin;

create table if not exists public.paypal_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_type text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  payload jsonb
);

comment on table public.paypal_webhook_events is 'Logs PayPal webhooks for idempotency and debugging';

commit;
