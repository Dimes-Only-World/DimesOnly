-- Create profile_likes table for tracking profile likes
CREATE TABLE IF NOT EXISTS public.profile_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_user_id UUID NOT NULL,
    liker_user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure a user can only like a profile once
    UNIQUE(profile_user_id, liker_user_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_profile_likes_profile_user_id ON public.profile_likes(profile_user_id);
CREATE INDEX IF NOT EXISTS idx_profile_likes_liker_user_id ON public.profile_likes(liker_user_id);

-- Enable Row Level Security
ALTER TABLE public.profile_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can view profile likes (to count them)
CREATE POLICY "Anyone can view profile likes" ON public.profile_likes
    FOR SELECT USING (true);

-- Authenticated users can like profiles (insert their own likes)
CREATE POLICY "Users can like profiles" ON public.profile_likes
    FOR INSERT WITH CHECK (auth.uid()::text = liker_user_id::text);

-- Users can unlike profiles (delete their own likes)
CREATE POLICY "Users can unlike profiles" ON public.profile_likes
    FOR DELETE USING (auth.uid()::text = liker_user_id::text);

-- Grant permissions
GRANT SELECT ON public.profile_likes TO authenticated;
GRANT INSERT, DELETE ON public.profile_likes TO authenticated;
GRANT SELECT ON public.profile_likes TO anon;