-- Add separate free spots columns for males and females
ALTER TABLE events ADD COLUMN IF NOT EXISTS free_spots_males INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS free_spots_females INTEGER DEFAULT 0;

-- Initialize the new columns with values from free_males_females split evenly, or from free_normal
UPDATE events
SET 
  free_spots_males = COALESCE(
    CASE WHEN free_males_females > 0 THEN free_males_females / 2 ELSE free_normal END,
    0
  ),
  free_spots_females = COALESCE(
    CASE WHEN free_males_females > 0 THEN free_males_females / 2 ELSE free_normal END,
    0
  )
WHERE free_spots_males = 0 AND free_spots_females = 0;