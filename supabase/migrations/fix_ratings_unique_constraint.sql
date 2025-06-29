-- Fix ratings table unique constraint
-- The current constraint prevents a user from rating the same person multiple times
-- But our system should allow users to change their rating number for the same person

-- Drop the problematic unique constraint
ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_user_id_rater_id_year_key;

-- Add a new unique constraint that allows one rating per number per user per year
-- This prevents duplicate number assignments but allows rating changes
ALTER TABLE ratings ADD CONSTRAINT ratings_rater_rating_year_unique 
    UNIQUE (rater_id, rating, year);

-- Also ensure we have proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_ratings_user_rater_year ON ratings(user_id, rater_id, year);

SELECT 'Ratings unique constraint fixed - now allows rating updates!' as status; 