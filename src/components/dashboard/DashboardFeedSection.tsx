import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Heart,
  MessageCircle,
  Play,
  Share2,
  Grid3X3,
  Clapperboard,
  Volume2,
  VolumeX,
  X,
  Send,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { fetchActiveAds, DashboardAd } from "@/lib/dashboardAds";
import { resolveMediaUrls } from "@/lib/privateMedia";
import AdSlot from "./AdSlot";

interface MediaRow {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  filename: string | null;
  created_at: string;
}

interface Author {
  id: string;
  username: string;
  profile_photo: string | null;
  user_type: string | null;
}

interface FeedItem extends MediaRow {
  author?: Author;
  likeCount: number;
  commentCount: number;
  liked: boolean;
}

/** Keep only the newest photo and newest video per uploader. */
const latestPerUser = (rows: MediaRow[]) => {
  const seen = new Set<string>();
  return rows.filter((r) => {
    const key = `${r.user_id}:${r.media_type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

const prettyTitle = (item: FeedItem) => {
  const base = (item.filename || "").replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim();
  if (base) return base.slice(0, 70);
  return `${item.author?.username || "Dime"} — exclusive clip`;
};

const DashboardFeedSection: React.FC = () => {
  const { user } = useAppContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<FeedItem[]>([]);
  const [videos, setVideos] = useState<FeedItem[]>([]);
  const [ads, setAds] = useState<DashboardAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"grid" | "watch">("grid");
  const [active, setActive] = useState<FeedItem | null>(null);
  const [muted, setMuted] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // The feed only ever shows silver-tier content.
      const tier = "silver";


      const [{ data: media }, adRows] = await Promise.all([
        supabase
          .from("user_media")
          .select("id, user_id, media_url, media_type, filename, created_at")
          .eq("content_tier", tier)
          .order("created_at", { ascending: false })
          .limit(400),
        fetchActiveAds(),
      ]);

      const rows = latestPerUser((media || []) as MediaRow[]);
      const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
      const mediaIds = rows.map((r) => r.id);

      const [{ data: authorRows }, { data: likeRows }, { data: commentRows }] = await Promise.all([
        userIds.length
          ? supabase
              .from("public_user_profiles")
              .select("id, username, profile_photo, user_type")
              .in("id", userIds)
          : Promise.resolve({ data: [] as any[] }),
        mediaIds.length
          ? supabase.from("media_likes").select("media_id, user_id").in("media_id", mediaIds)
          : Promise.resolve({ data: [] as any[] }),
        mediaIds.length
          ? supabase.from("media_comments").select("media_id").in("media_id", mediaIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const authorMap = new Map<string, Author>((authorRows || []).map((a: any) => [a.id, a]));
      const likeCounts = new Map<string, number>();
      const likedByMe = new Set<string>();
      (likeRows || []).forEach((l: any) => {
        likeCounts.set(l.media_id, (likeCounts.get(l.media_id) || 0) + 1);
        if (user?.id && l.user_id === user.id) likedByMe.add(l.media_id);
      });
      const commentCounts = new Map<string, number>();
      (commentRows || []).forEach((c: any) =>
        commentCounts.set(c.media_id, (commentCounts.get(c.media_id) || 0) + 1),
      );

      // Stored URLs point at a private bucket, so they need signed links to render.
      const urlMap = await resolveMediaUrls(rows.map((r) => r.media_url));

      const items: FeedItem[] = rows.map((r) => ({
        ...r,
        media_url: urlMap[r.media_url] || r.media_url,
        author: authorMap.get(r.user_id),
        likeCount: likeCounts.get(r.id) || 0,
        commentCount: commentCounts.get(r.id) || 0,
        liked: likedByMe.has(r.id),
      }));

      setPhotos(items.filter((i) => i.media_type === "photo"));
      setVideos(items.filter((i) => i.media_type === "video"));
      setAds(adRows);
    } catch (e) {
      console.warn("dashboard feed load failed", e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleLike = async (item: FeedItem) => {
    if (!user?.id) {
      toast({ title: "Sign in required", description: "Log in to like content." });
      return;
    }
    const setter = item.media_type === "photo" ? setPhotos : setVideos;
    const nextLiked = !item.liked;
    setter((prev) =>
      prev.map((p) =>
        p.id === item.id
          ? { ...p, liked: nextLiked, likeCount: Math.max(0, p.likeCount + (nextLiked ? 1 : -1)) }
          : p,
      ),
    );
    setActive((a) =>
      a && a.id === item.id
        ? { ...a, liked: nextLiked, likeCount: Math.max(0, a.likeCount + (nextLiked ? 1 : -1)) }
        : a,
    );
    try {
      if (nextLiked) {
        await supabase.from("media_likes").insert({ media_id: item.id, user_id: user.id });
      } else {
        await supabase.from("media_likes").delete().eq("media_id", item.id).eq("user_id", user.id);
      }
    } catch (e) {
      console.warn("like failed", e);
    }
  };

  const share = async (item: FeedItem) => {
    const url = item.author?.username
      ? `${window.location.origin}/profile/${item.author.username}`
      : window.location.origin;
    try {
      if (navigator.share) await navigator.share({ title: "Dimes Only", url });
      else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied", description: url });
      }
    } catch {
      /* cancelled */
    }
  };

  /** Split a list into rows and drop an ad in after every 4 rows. */
  const withAds = <T,>(list: T[], perRow: number) => {
    const rows: T[][] = [];
    for (let i = 0; i < list.length; i += perRow) rows.push(list.slice(i, i + perRow));
    const blocks: { rows: T[][]; ad?: DashboardAd }[] = [];
    for (let i = 0; i < rows.length; i += 4) {
      blocks.push({ rows: rows.slice(i, i + 4), ad: ads[Math.floor(i / 4) % (ads.length || 1)] });
    }
    return blocks;
  };

  const photoBlocks = useMemo(() => withAds(photos, 3), [photos, ads]);
  const videoBlocks = useMemo(() => withAds(videos, 3), [videos, ads]);

  const stories = useMemo(() => {
    const seen = new Set<string>();
    return photos
      .filter((p) => p.author?.username && !seen.has(p.user_id) && seen.add(p.user_id))
      .slice(0, 14);
  }, [photos]);

  return (
    <section className="mb-8 w-full rounded-2xl border border-border/60 bg-dimes-surface p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold tracking-tight sm:text-xl">The Feed</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab("grid")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
              tab === "grid" ? "bg-dimes-magenta text-white" : "bg-muted text-foreground"
            }`}
          >
            <Grid3X3 className="h-4 w-4" /> Photos
          </button>
          <button
            onClick={() => setTab("watch")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
              tab === "watch" ? "bg-dimes-magenta text-white" : "bg-muted text-foreground"
            }`}
          >
            <Clapperboard className="h-4 w-4" /> Watch
          </button>
          <button
            onClick={() => navigate("/feed/create")}
            className="rounded-full bg-black px-3 py-1.5 text-xs font-bold text-white"
          >
            Post
          </button>
        </div>
      </div>

      {/* Stories rail */}
      {stories.length > 0 && (
        <div className="mb-4 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {stories.map((s) => (
            <Link
              key={s.id}
              to={`/profile/${s.author?.username}`}
              className="flex w-16 shrink-0 flex-col items-center gap-1"
            >
              <span className="rounded-full bg-gradient-to-tr from-dimes-magenta to-amber-400 p-[2px]">
                <img
                  src={s.author?.profile_photo || s.media_url}
                  alt={s.author?.username || ""}
                  className="h-14 w-14 rounded-full border-2 border-white object-cover"
                />
              </span>
              <span className="w-full truncate text-center text-[10px] font-semibold">
                @{s.author?.username}
              </span>
            </Link>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : tab === "grid" ? (
        photos.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No photos yet.</p>
        ) : (
          photoBlocks.map((block, bi) => (
            <div key={bi}>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {block.rows.flat().map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActive(item)}
                    className="group relative aspect-square overflow-hidden rounded-lg bg-muted"
                  >
                    <img
                      src={item.media_url}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <span className="absolute inset-0 hidden items-center justify-center gap-4 bg-black/45 text-sm font-bold text-white group-hover:flex">
                      <span className="flex items-center gap-1">
                        <Heart className="h-4 w-4 fill-white" /> {item.likeCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-4 w-4" /> {item.commentCount}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              {block.ad && <AdSlot ad={block.ad} />}
            </div>
          ))
        )
      ) : videos.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No videos yet.</p>
      ) : (
        videoBlocks.map((block, bi) => (
          <div key={bi}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {block.rows.flat().map((item) => (
                <article key={item.id} className="group">
                  <button
                    onClick={() => setActive(item)}
                    className="relative block w-full overflow-hidden rounded-xl bg-black"
                  >
                    <video
                      className="aspect-video w-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                      onMouseOver={(e) => (e.currentTarget as HTMLVideoElement).play().catch(() => {})}
                      onMouseOut={(e) => {
                        const v = e.currentTarget as HTMLVideoElement;
                        v.pause();
                        v.currentTime = 0;
                      }}
                    >
                      <source src={item.media_url} />
                    </video>
                    <span className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90">
                        <Play className="ml-0.5 h-6 w-6 text-black" fill="black" />
                      </span>
                    </span>
                  </button>
                  <div className="mt-2 flex gap-2">
                    <Link to={`/profile/${item.author?.username || ""}`} className="shrink-0">
                      <img
                        src={item.author?.profile_photo || "/placeholder.svg"}
                        alt=""
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold leading-snug">
                        {prettyTitle(item)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        @{item.author?.username} · {item.likeCount} likes · {timeAgo(item.created_at)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {block.ad && <AdSlot ad={block.ad} />}
          </div>
        ))
      )}

      {active && (
        <MediaViewer
          item={active}
          muted={muted}
          onToggleMute={() => setMuted((m) => !m)}
          onClose={() => setActive(null)}
          onLike={() => toggleLike(active)}
          onShare={() => share(active)}
        />
      )}
    </section>
  );
};

/* ---------------------------------------------------------------- viewer */

interface ViewerProps {
  item: FeedItem;
  muted: boolean;
  onToggleMute: () => void;
  onClose: () => void;
  onLike: () => void;
  onShare: () => void;
}

const MediaViewer: React.FC<ViewerProps> = ({ item, muted, onToggleMute, onClose, onLike, onShare }) => {
  const { user } = useAppContext();
  const [comments, setComments] = useState<{ id: string; comment_text: string; username?: string }[]>([]);
  const [text, setText] = useState("");

  const loadComments = useCallback(async () => {
    const { data } = await supabase
      .from("media_comments")
      .select("id, user_id, comment_text, created_at")
      .eq("media_id", item.id)
      .order("created_at", { ascending: true })
      .limit(100);
    const rows = data || [];
    const ids = Array.from(new Set(rows.map((r: any) => r.user_id)));
    const { data: profs } = ids.length
      ? await supabase.from("public_user_profiles").select("id, username").in("id", ids)
      : { data: [] as any[] };
    const nameMap = new Map((profs || []).map((p: any) => [p.id, p.username]));
    setComments(rows.map((r: any) => ({ ...r, username: nameMap.get(r.user_id) })));
  }, [item.id]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const submit = async () => {
    if (!user?.id || !text.trim()) return;
    const comment_text = text.trim();
    setText("");
    await supabase.from("media_comments").insert({ media_id: item.id, user_id: user.id, comment_text });
    loadComments();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-2 sm:p-6">
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-3 top-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>
      <div className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-black md:flex-row">
        <div className="relative flex flex-1 items-center justify-center bg-black">
          {item.media_type === "video" ? (
            <>
              <video
                key={item.id}
                className="max-h-[60vh] w-full object-contain md:max-h-[80vh]"
                controls
                autoPlay
                playsInline
                muted={muted}
              >
                <source src={item.media_url} />
              </video>
              <button
                onClick={onToggleMute}
                className="absolute bottom-3 left-3 rounded-full bg-black/60 p-2 text-white"
                aria-label={muted ? "Unmute" : "Mute"}
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </>
          ) : (
            <img
              src={item.media_url}
              alt=""
              className="max-h-[60vh] w-full object-contain md:max-h-[80vh]"
            />
          )}
        </div>

        <aside className="flex w-full flex-col bg-white md:w-80">
          <div className="flex items-center gap-2 border-b p-3">
            <img
              src={item.author?.profile_photo || "/placeholder.svg"}
              alt=""
              className="h-9 w-9 rounded-full object-cover"
            />
            <Link
              to={`/profile/${item.author?.username || ""}`}
              className="text-sm font-bold hover:underline"
            >
              @{item.author?.username}
            </Link>
            <span className="ml-auto text-[11px] text-slate-500">{timeAgo(item.created_at)}</span>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
            {comments.length === 0 && <p className="text-slate-500">No comments yet.</p>}
            {comments.map((c) => (
              <p key={c.id} className="text-slate-800">
                <span className="mr-1 font-semibold">@{c.username || "user"}</span>
                {c.comment_text}
              </p>
            ))}
          </div>

          <div className="flex items-center gap-4 border-t p-3">
            <button onClick={onLike} className="flex items-center gap-1" aria-label="Like">
              <Heart className={`h-6 w-6 ${item.liked ? "fill-dimes-magenta text-dimes-magenta" : "text-slate-800"}`} />
              <span className="text-sm font-semibold">{item.likeCount}</span>
            </button>
            <span className="flex items-center gap-1 text-slate-800">
              <MessageCircle className="h-6 w-6" />
              <span className="text-sm font-semibold">{comments.length}</span>
            </span>
            <button onClick={onShare} className="ml-auto" aria-label="Share">
              <Share2 className="h-5 w-5 text-slate-800" />
            </button>
          </div>

          <div className="flex items-center gap-2 border-t p-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Add a comment…"
              className="flex-1 rounded-full border px-3 py-2 text-sm outline-none focus:border-dimes-magenta"
            />
            <button onClick={submit} className="rounded-full bg-dimes-magenta p-2 text-white" aria-label="Send">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default DashboardFeedSection;
