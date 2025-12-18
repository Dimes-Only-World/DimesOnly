-- Add host_user_id to events table for tracking event owner
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS host_user_id uuid REFERENCES public.users(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_events_host_user_id ON public.events(host_user_id);

-- Add event_transactions table for detailed transaction logging
CREATE TABLE IF NOT EXISTS public.event_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id),
  event_owner_id uuid REFERENCES public.users(id),
  buyer_id uuid REFERENCES public.users(id),
  payment_id uuid REFERENCES public.payments(id),
  paypal_transaction_id text,
  amount numeric NOT NULL,
  currency text DEFAULT 'USD',
  payment_status text DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on event_transactions
ALTER TABLE public.event_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own transactions (as buyer or owner)
CREATE POLICY "Users can view own event transactions"
  ON public.event_transactions
  FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = event_owner_id);

-- Policy: Service role can do everything
CREATE POLICY "Service role full access on event_transactions"
  ON public.event_transactions
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add event_owner_earnings table for tracking owner earnings
CREATE TABLE IF NOT EXISTS public.event_owner_earnings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id),
  event_id uuid REFERENCES public.events(id),
  transaction_id uuid REFERENCES public.event_transactions(id),
  amount numeric NOT NULL,
  earnings_type text DEFAULT 'ticket_sale',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_owner_earnings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own earnings
CREATE POLICY "Users can view own event earnings"
  ON public.event_owner_earnings
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role full access
CREATE POLICY "Service role full access on event_owner_earnings"
  ON public.event_owner_earnings
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add total_earnings and available_balance to users if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'event_total_earnings') THEN
    ALTER TABLE public.users ADD COLUMN event_total_earnings numeric DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'event_available_balance') THEN
    ALTER TABLE public.users ADD COLUMN event_available_balance numeric DEFAULT 0;
  END IF;
END $$;