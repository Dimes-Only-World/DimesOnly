import { useEffect, useState } from "react";
import { Heart, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { FeedMediaRow, FeedPostRow } from "@/lib/feedApi";
import { useAppContext } from "@/contexts/AppContext";
import FeedMediaItem from "./FeedMediaItem";
import { Link } from "react-router-dom";

interface Author {
  id: string;
  username: string;
  profile_photo: string | null;
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  username?: string;
}

export default function FeedPostCard({
  post,
  media,
  author,
}: {
  post: FeedPostRow;
  media: FeedMediaRow[];
  author?: Author;
}) {
  const { user } = useAppContext();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [carouselIdx, setCarouselIdx] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("feed_likes")
      .select("id")
      .eq("post_id", post.id)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setLiked(!!data));
  }, [user?.id, post.id]);

  const toggleLike = async () => {
    if (!user?.id) return;
    if (liked) {
      await supabase.from("feed_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
      setLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from("feed_likes").insert({ post_id: post.id, user_id: user.id });
      setLiked(true);
      setLikeCount((c) => c + 1);
    }
  };

  const loadComments = async () => {
    const { data } = await supabase
      .from("feed_comments")
      .select("id, user_id, content, created_at")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true })
      .limit(50);
    if (!data) return;
    const ids = Array.from(new Set(data.map((c: any) => c.user_id)));
    const { data: usersRows } = ids.length
      ? await supabase.from("public_user_profiles").select("id, username").in("id", ids)
      : { data: [] as any[] };
    const nameMap = new Map((usersRows || []).map((u: any) => [u.id, u.username]));
    setComments(data.map((c: any) => ({ ...c, username: nameMap.get(c.user_id) })));
  };

  const openComments = async () => {
    setShowComments((s) => !s);
    if (!showComments) await loadComments();
  };

  const submitComment = async () => {
    if (!user?.id || !newComment.trim()) return;
    const content = newComment.trim();
    setNewComment("");
    await supabase.from("feed_comments").insert({ post_id: post.id, user_id: user.id, content });
    await loadComments();
  };

  const current = media[carouselIdx];

  return (
    <article className="bg-card border border-border rounded-xl overflow-hidden shadow-lg mb-6">
      <header className="flex items-center gap-3 p-3">
        <Link to={author?.username ? `/profile/${author.username}` : "#"}>
          <img
            src={author?.profile_photo || "/placeholder.svg"}
            alt={author?.username || ""}
            className="w-10 h-10 rounded-full object-cover border-2 border-primary"
          />
        </Link>
        <div className="flex-1">
          <Link to={author?.username ? `/profile/${author.username}` : "#"} className="font-semibold text-foreground hover:underline">
            @{author?.username || "user"}
          </Link>
          <p className="text-xs text-muted-foreground">
            {new Date(post.created_at).toLocaleDateString()}
            {post.visibility === "money_circle" && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold uppercase">
                Money Circle
              </span>
            )}
          </p>
        </div>
      </header>

      {current && <FeedMediaItem media={current} />}

      {media.length > 1 && (
        <div className="flex justify-center gap-1 py-2">
          {media.map((_, i) => (
            <button
              key={i}
              onClick={() => setCarouselIdx(i)}
              className={`w-2 h-2 rounded-full transition ${i === carouselIdx ? "bg-primary" : "bg-muted"}`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}

      <div className="px-4 py-3">
        <div className="flex items-center gap-4 mb-2">
          <button onClick={toggleLike} className="flex items-center gap-1.5 group" aria-label="Like">
            <Heart
              className={`w-6 h-6 transition ${liked ? "fill-primary text-primary" : "text-foreground group-hover:text-primary"}`}
            />
            <span className="text-sm font-semibold">{likeCount}</span>
          </button>
          <button onClick={openComments} className="flex items-center gap-1.5 group" aria-label="Comments">
            <MessageCircle className="w-6 h-6 text-foreground group-hover:text-primary" />
            <span className="text-sm font-semibold">{post.comment_count}</span>
          </button>
        </div>

        {post.caption && (
          <p className="text-sm text-foreground whitespace-pre-wrap">
            <span className="font-semibold mr-2">@{author?.username}</span>
            {post.caption}
          </p>
        )}

        {showComments && (
          <div className="mt-3 space-y-2 border-t border-border pt-3">
            {comments.map((c) => (
              <div key={c.id} className="text-sm">
                <span className="font-semibold mr-2">@{c.username || "user"}</span>
                {c.content}
              </div>
            ))}
            {user?.id && (
              <div className="flex gap-2 mt-2">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment…"
                  onKeyDown={(e) => e.key === "Enter" && submitComment()}
                />
                <Button size="sm" onClick={submitComment} disabled={!newComment.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
