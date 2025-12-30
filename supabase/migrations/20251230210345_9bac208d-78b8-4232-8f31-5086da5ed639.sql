-- Add banner_video_url column to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS banner_video_url TEXT;