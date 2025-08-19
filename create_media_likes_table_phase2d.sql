-- Create Media Likes Table for Phase 2D
-- This table will store user likes on media content

CREATE TABLE IF NOT EXISTS media_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    media_id UUID NOT NULL REFERENCES user_media(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure a user can only like a media item once
    UNIQUE(media_id, user_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_media_likes_media_id ON media_likes(media_id);
CREATE INDEX IF NOT EXISTS idx_media_likes_user_id ON media_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_media_likes_created_at ON media_likes(created_at);

-- Enable Row Level Security
ALTER TABLE media_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can like/unlike media
CREATE POLICY "Users can like media" ON media_likes
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Users can view likes on media
CREATE POLICY "Users can view media likes" ON media_likes
    FOR SELECT USING (true);

-- Grant permissions
GRANT ALL ON media_likes TO authenticated;
GRANT SELECT ON media_likes TO anon;
