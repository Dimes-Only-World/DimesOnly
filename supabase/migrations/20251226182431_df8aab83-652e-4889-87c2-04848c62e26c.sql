-- Add new columns to events table for ticket types and pricing
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS free_males_females integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS vip_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS vip_section_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS vip_section_attendees integer DEFAULT 4,
ADD COLUMN IF NOT EXISTS males_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS females_price numeric DEFAULT 0;

-- Add new columns to user_events table for ticket details
ALTER TABLE public.user_events
ADD COLUMN IF NOT EXISTS ticket_type text DEFAULT 'free',
ADD COLUMN IF NOT EXISTS ticket_quantity integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS amount_paid numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS checked_in boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS checked_in_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS phone_number text;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_events_ticket_type ON public.user_events(ticket_type);
CREATE INDEX IF NOT EXISTS idx_user_events_checked_in ON public.user_events(checked_in);

-- Add comment for documentation
COMMENT ON COLUMN public.events.free_males_females IS 'Number of free spots for males and normal females';
COMMENT ON COLUMN public.events.vip_price IS 'Price for VIP tickets';
COMMENT ON COLUMN public.events.vip_section_price IS 'Price for VIP section (group)';
COMMENT ON COLUMN public.events.vip_section_attendees IS 'Number of people allowed per VIP section';
COMMENT ON COLUMN public.events.males_price IS 'General admission price for males';
COMMENT ON COLUMN public.events.females_price IS 'General admission price for females';
COMMENT ON COLUMN public.user_events.ticket_type IS 'Type: free, general, vip, vip_section';
COMMENT ON COLUMN public.user_events.ticket_quantity IS 'Number of tickets purchased';
COMMENT ON COLUMN public.user_events.amount_paid IS 'Total amount paid for tickets';
COMMENT ON COLUMN public.user_events.checked_in IS 'Whether attendee has checked in';