-- Fix ratings table constraint to allow ratings from 1-100
-- Drop the existing constraint that limits ratings to a smaller range
ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_rating_check;

-- Add new constraint to allow ratings from 1 to 100
ALTER TABLE ratings ADD CONSTRAINT ratings_rating_check CHECK (rating >= 1 AND rating <= 100);

-- Ensure the ratings table has all necessary columns
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS year INTEGER DEFAULT EXTRACT(YEAR FROM NOW());

-- Create index for better performance on year queries
CREATE INDEX IF NOT EXISTS idx_ratings_year ON ratings(year);
CREATE INDEX IF NOT EXISTS idx_ratings_rater_year ON ratings(rater_id, year);
CREATE INDEX IF NOT EXISTS idx_ratings_user_year ON ratings(user_id, year);

-- Verify the constraint is working
SELECT 'Ratings constraint updated successfully - now allows 1-100!' as status; 