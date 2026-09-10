ALTER TABLE public.flix_titles
ADD COLUMN IF NOT EXISTS coming_soon boolean NOT NULL DEFAULT false;