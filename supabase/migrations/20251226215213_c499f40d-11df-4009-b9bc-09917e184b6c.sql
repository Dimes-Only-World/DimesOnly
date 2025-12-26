-- Add VIP sections, VIP tickets, group discount, and free normal columns to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS vip_sections integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS vip_tickets integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS group_discount_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS group_capacity integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS free_normal integer DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN public.events.vip_sections IS 'Number of VIP sections available';
COMMENT ON COLUMN public.events.vip_tickets IS 'Number of VIP tickets available';
COMMENT ON COLUMN public.events.group_discount_price IS 'Price for group discount tickets';
COMMENT ON COLUMN public.events.group_capacity IS 'Number of people per group for group discount';
COMMENT ON COLUMN public.events.free_normal IS 'Number of free spots for normal males/females';