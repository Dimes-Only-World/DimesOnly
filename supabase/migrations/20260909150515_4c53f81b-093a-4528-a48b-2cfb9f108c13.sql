ALTER TABLE public.flix_titles
  ADD COLUMN IF NOT EXISTS poster_mobile_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS backdrop_mobile_url text NOT NULL DEFAULT '';