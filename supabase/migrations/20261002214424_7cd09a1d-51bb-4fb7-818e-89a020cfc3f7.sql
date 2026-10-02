CREATE TABLE public.profile_photo_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_user_id uuid NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_user_id, user_id)
);
GRANT SELECT ON public.profile_photo_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.profile_photo_likes TO authenticated;
GRANT ALL ON public.profile_photo_likes TO service_role;
ALTER TABLE public.profile_photo_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ppl_select" ON public.profile_photo_likes FOR SELECT USING (true);
CREATE POLICY "ppl_insert" ON public.profile_photo_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ppl_delete" ON public.profile_photo_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.profile_photo_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_user_id uuid NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  comment_text text NOT NULL CHECK (char_length(comment_text) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.profile_photo_comments (profile_user_id, created_at);
GRANT SELECT ON public.profile_photo_comments TO anon;
GRANT SELECT, INSERT, DELETE ON public.profile_photo_comments TO authenticated;
GRANT ALL ON public.profile_photo_comments TO service_role;
ALTER TABLE public.profile_photo_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ppc_select" ON public.profile_photo_comments FOR SELECT USING (true);
CREATE POLICY "ppc_insert" ON public.profile_photo_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ppc_delete" ON public.profile_photo_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON public.media_likes TO authenticated;
GRANT SELECT ON public.media_likes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_comments TO authenticated;
GRANT SELECT ON public.media_comments TO anon;