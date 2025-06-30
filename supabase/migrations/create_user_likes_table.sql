-- Create user_likes table for the likes feature
CREATE TABLE IF NOT EXISTS user_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liked_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  liker_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(liked_user_id, liker_user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_likes_liked_user ON user_likes(liked_user_id);
CREATE INDEX IF NOT EXISTS idx_user_likes_liker_user ON user_likes(liker_user_id);

-- Enable Row Level Security
ALTER TABLE user_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view likes" ON user_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can like profiles" ON user_likes
  FOR INSERT WITH CHECK (auth.uid() = liker_user_id);

CREATE POLICY "Users can unlike profiles" ON user_likes
  FOR DELETE USING (auth.uid() = liker_user_id);

SELECT 'User likes table created successfully!' as status; 