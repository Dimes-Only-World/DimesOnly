ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS free_spots_dimes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_spots_normals integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_spots_silver_plus integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_spots_diamond_plus integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_spots_elite_plus integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_spots_plus integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS general_admission_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plus_ticket_mode text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS plus_discount_percent numeric NOT NULL DEFAULT 0;