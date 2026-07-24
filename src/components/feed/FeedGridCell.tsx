import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, Send, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { getSignedFeedUrl, FeedMediaRow, FeedPostRow } from "@/lib/feedApi";
import { useAppContext } from "@/contexts/AppContext";

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

interface Props {
  post: FeedPostRow;
  media: FeedMediaRow;
  author?: Author;
  onOpen: (url: string, mediaType: "photo" | "video") => void;
}

export default function FeedGridCell({ post, media, author, onOpen }: Props) {
  const { user } = useAppContext();
  const [url, setUrl] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [commentCount, setCommentCount] = useState(post.comment_count);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    let cancelled = false;
    getSignedFeedUrl(media.storage_bucket, media.storage_path).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [media.storage_bucket, media.storage_path]);

  useEffect(() => {
    supabase
      .from("feed_comments")
      .select("id", { count: "exact", head: true })
      .eq("post_id", post.id)
      .then(({ count }) => setCommentCount(Number(count) || 0));
  }, [post.id]);

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

  const toggleComments = async () => {
    const next = !showComments;
    setShowComments(next);
    if (next) await loadComments();
  };

  const submitComment = async () => {
    if (!user?.id || !newComment.trim()) return;
    const content = newComment.trim();
    setNewComment("");
    await supabase.from("feed_comments").insert({ post_id: post.id, user_id: user.id, content });
    setCommentCount((c) => c + 1);
    await loadComments();
  };

  return (
    <figure className="bg-card border border-border rounded-lg overflow-hidden shadow-sm flex flex-col">
      {/* Media tile */}
      <button
        type="button"
        onClick={() => url && onOpen(url, media.media_type)}
        className="relative w-full aspect-square overflow-hidden bg-muted group focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label={media.media_type === "video" ? "Play video" : "View photo"}
      >
        {!url ? (
          <div className="w-full h-full bg-muted animate-pulse" />
        ) : media.media_type === "video" ? (
          <>
            <video
              src={url}
              className="w-full h-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/40 transition">
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                <Play className="w-6 h-6 text-black ml-0.5" fill="black" />
              </div>
            </div>
          </>
        ) : (
          <img
            src={url}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        )}
      </button>

      {/* Author */}
      <figcaption className="px-3 pt-2 flex items-center gap-2 min-w-0">
        <Link to={author?.username ? `/profile/${author.username}` : "#"} className="shrink-0">
          <img
            src={author?.profile_photo || "/placeholder.svg"}
            alt=""
            className="w-7 h-7 rounded-full object-cover border border-primary/40"
          />
        </Link>
        <Link
          to={author?.username ? `/profile/${author.username}` : "#"}
          className="text-sm font-semibold truncate hover:underline"
        >
          @{author?.username || "user"}
        </Link>
        <span className="ml-auto text-[11px] text-muted-foreground shrink-0">
          {new Date(post.created_at).toLocaleDateString()}
        </span>
      </figcaption>

      {/* Actions */}
      <div className="px-3 py-2 flex items-center gap-4">
        <button
          onClick={toggleLike}
          className="flex items-center gap-1 group"
          aria-label="Like"
        >
          <Heart
            className={`w-5 h-5 transition ${
              liked ? "fill-primary text-primary" : "text-foreground group-hover:text-primary"
            }`}
          />
          <span className="text-xs font-semibold">{likeCount}</span>
        </button>
        <button
          onClick={toggleComments}
          className="flex items-center gap-1 group"
          aria-label="Comments"
        >
          <MessageCircle className="w-5 h-5 text-foreground group-hover:text-primary" />
          <span className="text-xs font-semibold">{commentCount}</span>
        </button>
      </div>

      {post.caption && (
        <p className="px-3 pb-2 text-xs text-foreground whitespace-pre-wrap line-clamp-3">
          <span className="font-semibold mr-1">@{author?.username}</span>
          {post.caption}
        </p>
      )}

      {showComments && (
        <div className="px-3 pb-3 space-y-2 border-t border-border pt-2 max-h-56 overflow-y-auto">
          {comments.length === 0 && (
            <p className="text-xs text-muted-foreground">No comments yet.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="text-xs">
              <span className="font-semibold mr-1">@{c.username || "user"}</span>
              {c.content}
            </div>
          ))}
          {user?.id && (
            <div className="flex gap-2 pt-1">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment…"
                className="h-8 text-xs"
                onKeyDown={(e) => e.key === "Enter" && submitComment()}
              />
              <Button size="sm" className="h-8 px-2" onClick={submitComment} disabled={!newComment.trim()}>
                <Send className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      )}
    </figure>
  );
}
