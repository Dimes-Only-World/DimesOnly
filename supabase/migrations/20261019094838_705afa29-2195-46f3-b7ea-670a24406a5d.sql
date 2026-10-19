ALTER TABLE public.vehicle_purchase_applications
  ADD COLUMN IF NOT EXISTS documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS requested_items text,
  ADD COLUMN IF NOT EXISTS access_key_hash text;