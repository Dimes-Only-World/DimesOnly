-- Add guest_name column to user_events table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_events' AND column_name = 'guest_name'
    ) THEN
        ALTER TABLE user_events ADD COLUMN guest_name TEXT;
        RAISE NOTICE 'Added guest_name column to user_events table';
    ELSE
        RAISE NOTICE 'guest_name column already exists in user_events table';
    END IF;
END $$; 