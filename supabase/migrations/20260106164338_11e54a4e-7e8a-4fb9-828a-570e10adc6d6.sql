-- Drop the problematic UNIQUE constraint that ignores year
-- This constraint traps numbers across years for the same rater
-- We keep UNIQUE(rater_id, rating, year) so numbers can be reused each season

ALTER TABLE public.ratings DROP CONSTRAINT IF EXISTS unique_user_rating;
ALTER TABLE public.ratings DROP CONSTRAINT IF EXISTS ratings_rater_id_rating_key;