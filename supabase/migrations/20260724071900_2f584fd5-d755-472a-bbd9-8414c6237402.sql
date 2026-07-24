
-- Posts (photo or reel)
CREATE TABLE public.feed_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_type text NOT NULL CHECK (post_type IN ('photo','reel')),
  caption text,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','money_circle')),
  like_count integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_feed_posts_user_created ON public.feed_posts(user_id, created_at DESC);
CREATE INDEX idx_feed_posts_created ON public.feed_posts(created_at DESC);
CREATE INDEX idx_feed_posts_visibility ON public.feed_posts(visibility);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feed_posts TO authenticated;
GRANT SELECT ON public.feed_posts TO anon;
GRANT ALL ON public.feed_posts TO service_role;

ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

-- Public posts visible to everyone; money_circle visible to author, their direct referrals, or their referrer
CREATE POLICY "feed_posts_select" ON public.feed_posts FOR SELECT
USING (
  visibility = 'public'
  OR user_id = auth.uid()
  OR (
    visibility = 'money_circle'
    AND auth.uid() IS NOT NULL
    AND (
      -- viewer is in author's direct referral network (author referred viewer, or viewer referred author)
      EXISTS (
        SELECT 1 FROM public.users author
        JOIN public.users viewer ON viewer.id = auth.uid()
        WHERE author.id = feed_posts.user_id
          AND (
            lower(coalesce(viewer.referred_by,'')) = lower(coalesce(author.username,''))
            OR lower(coalesce(author.referred_by,'')) = lower(coalesce(viewer.username,''))
          )
      )
    )
  )
);

CREATE POLICY "feed_posts_insert" ON public.feed_posts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "feed_posts_update" ON public.feed_posts FOR UPDATE
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "feed_posts_delete" ON public.feed_posts FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER trg_feed_posts_updated
BEFORE UPDATE ON public.feed_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Media attached to posts
CREATE TABLE public.feed_post_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  media_type text NOT NULL CHECK (media_type IN ('photo','video')),
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  public_url text,
  display_order integer NOT NULL DEFAULT 0,
  duration_seconds numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_feed_post_media_post ON public.feed_post_media(post_id, display_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feed_post_media TO authenticated;
GRANT SELECT ON public.feed_post_media TO anon;
GRANT ALL ON public.feed_post_media TO service_role;

ALTER TABLE public.feed_post_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feed_media_select" ON public.feed_post_media FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.feed_posts p WHERE p.id = post_id)
);

CREATE POLICY "feed_media_insert" ON public.feed_post_media FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.feed_posts p WHERE p.id = post_id AND p.user_id = auth.uid())
);

CREATE POLICY "feed_media_delete" ON public.feed_post_media FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.feed_posts p WHERE p.id = post_id AND p.user_id = auth.uid())
);

-- Likes
CREATE TABLE public.feed_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX idx_feed_likes_post ON public.feed_likes(post_id);
CREATE INDEX idx_feed_likes_user ON public.feed_likes(user_id);

GRANT SELECT, INSERT, DELETE ON public.feed_likes TO authenticated;
GRANT SELECT ON public.feed_likes TO anon;
GRANT ALL ON public.feed_likes TO service_role;

ALTER TABLE public.feed_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feed_likes_select" ON public.feed_likes FOR SELECT USING (true);

CREATE POLICY "feed_likes_insert" ON public.feed_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "feed_likes_delete" ON public.feed_likes FOR DELETE
USING (auth.uid() = user_id);

-- Comments
CREATE TABLE public.feed_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_feed_comments_post ON public.feed_comments(post_id, created_at);

GRANT SELECT, INSERT, DELETE ON public.feed_comments TO authenticated;
GRANT SELECT ON public.feed_comments TO anon;
GRANT ALL ON public.feed_comments TO service_role;

ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feed_comments_select" ON public.feed_comments FOR SELECT USING (true);

CREATE POLICY "feed_comments_insert" ON public.feed_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "feed_comments_delete" ON public.feed_comments FOR DELETE
USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.feed_posts p WHERE p.id = post_id AND p.user_id = auth.uid())
);

-- Triggers to keep like/comment counts on the post row
CREATE OR REPLACE FUNCTION public.feed_bump_like_count()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.feed_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.feed_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_feed_like_ins AFTER INSERT ON public.feed_likes
FOR EACH ROW EXECUTE FUNCTION public.feed_bump_like_count();
CREATE TRIGGER trg_feed_like_del AFTER DELETE ON public.feed_likes
FOR EACH ROW EXECUTE FUNCTION public.feed_bump_like_count();

CREATE OR REPLACE FUNCTION public.feed_bump_comment_count()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.feed_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.feed_posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_feed_comment_ins AFTER INSERT ON public.feed_comments
FOR EACH ROW EXECUTE FUNCTION public.feed_bump_comment_count();
CREATE TRIGGER trg_feed_comment_del AFTER DELETE ON public.feed_comments
FOR EACH ROW EXECUTE FUNCTION public.feed_bump_comment_count();
