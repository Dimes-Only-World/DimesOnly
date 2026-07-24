import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Users, Home } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import { useAppContext } from "@/contexts/AppContext";
import { fetchFeed, FeedPostRow, FeedMediaRow } from "@/lib/feedApi";
import FeedGridCell from "@/components/feed/FeedGridCell";
import FeedMediaModal from "@/components/feed/FeedMediaModal";
import { supabase } from "@/lib/supabase";

export default function Feed() {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"all" | "circle">("all");
  const [posts, setPosts] = useState<FeedPostRow[]>([]);
  const [media, setMedia] = useState<FeedMediaRow[]>([]);
  const [authors, setAuthors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [circleCount, setCircleCount] = useState(0);
  const [modal, setModal] = useState<{ url: string; type: "photo" | "video" } | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const { data: rpcData } = await supabase.rpc("get_my_referrals_count");
        const rpcCount = Number(rpcData) || 0;
        if (rpcCount > 0) {
          setCircleCount(rpcCount);
          return;
        }
        const username = (user as any)?.username;
        if (!username) return;
        const { count } = await supabase
          .from("users")
          .select("id", { count: "exact", head: true })
          .ilike("referred_by", username);
        setCircleCount(Number(count) || 0);
      } catch (e) {
        console.warn("circle count failed", e);
      }
    })();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    fetchFeed(tab, user.id)
      .then((r) => {
        setPosts(r.posts);
        setMedia(r.media);
        setAuthors(r.authors);
      })
      .finally(() => setLoading(false));
  }, [tab, user?.id]);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link to="/dashboard">
                <Button variant="ghost" size="icon" aria-label="Home">
                  <Home className="w-5 h-5" />
                </Button>
              </Link>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-yellow-400 bg-clip-text text-transparent">
                Feed
              </h1>
            </div>
            <Button
              onClick={() => navigate("/feed/create")}
              className="bg-gradient-to-r from-primary to-pink-600 hover:opacity-90"
            >
              <Plus className="w-4 h-4 mr-1" /> Create
            </Button>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 py-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto">
              <TabsTrigger value="all">Everyone</TabsTrigger>
              <TabsTrigger value="circle" className="gap-2">
                <Users className="w-4 h-4" /> Money Circle
                <span className="ml-1 text-xs bg-primary/20 text-primary rounded-full px-1.5">{circleCount}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <FeedGrid
                loading={loading}
                posts={posts}
                media={media}
                authors={authors}
                onOpen={(url, type) => setModal({ url, type })}
              />
            </TabsContent>
            <TabsContent value="circle" className="mt-4">
              <div className="mb-3 p-3 rounded-lg bg-card border border-border max-w-2xl mx-auto">
                <h2 className="font-semibold text-foreground">Your Money Circle</h2>
                <p className="text-sm text-muted-foreground">
                  Posts from the {circleCount} {circleCount === 1 ? "person" : "people"} you referred.
                </p>
              </div>
              <FeedGrid
                loading={loading}
                posts={posts}
                media={media}
                authors={authors}
                onOpen={(url, type) => setModal({ url, type })}
                emptyLabel="No posts from your circle yet."
              />
            </TabsContent>
          </Tabs>
        </div>

        <FeedMediaModal
          url={modal?.url ?? null}
          mediaType={modal?.type ?? null}
          onClose={() => setModal(null)}
        />
      </div>
    </AuthGuard>
  );
}

interface GridItem {
  post: FeedPostRow;
  media: FeedMediaRow;
  author?: { id: string; username: string; profile_photo: string | null };
}

function FeedGrid({
  loading,
  posts,
  media,
  authors,
  onOpen,
  emptyLabel = "No posts yet — be the first to create one!",
}: {
  loading: boolean;
  posts: FeedPostRow[];
  media: FeedMediaRow[];
  authors: any[];
  onOpen: (url: string, type: "photo" | "video") => void;
  emptyLabel?: string;
}) {
  if (loading) return <p className="text-center text-muted-foreground py-12">Loading feed…</p>;
  if (posts.length === 0) return <p className="text-center text-muted-foreground py-12">{emptyLabel}</p>;

  const authorMap = new Map(authors.map((a) => [a.id, a]));
  const mediaByPost = new Map<string, FeedMediaRow[]>();
  media.forEach((m) => {
    const arr = mediaByPost.get(m.post_id) || [];
    arr.push(m);
    mediaByPost.set(m.post_id, arr);
  });

  // Flatten: one grid cell per media item, preserving chronological (newest first) order.
  const items: GridItem[] = [];
  posts.forEach((post) => {
    const postMedia = (mediaByPost.get(post.id) || []).sort(
      (a, b) => a.display_order - b.display_order
    );
    postMedia.forEach((m) => {
      items.push({ post, media: m, author: authorMap.get(post.user_id) });
    });
  });

  if (items.length === 0) return <p className="text-center text-muted-foreground py-12">{emptyLabel}</p>;

  return (
    <div
      className="grid gap-2 sm:gap-3
        grid-cols-1
        portrait:grid-cols-1 landscape:grid-cols-2
        sm:grid-cols-2
        lg:grid-cols-3"
    >
      {items.map(({ post, media, author }) => (
        <figure
          key={media.id}
          className="bg-card border border-border rounded-lg overflow-hidden shadow-sm flex flex-col"
        >
          <FeedGridItem media={media} onOpen={onOpen} />
          <figcaption className="px-3 py-2 flex items-center gap-2 min-w-0">
            <Link
              to={author?.username ? `/profile/${author.username}` : "#"}
              className="shrink-0"
            >
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
        </figure>
      ))}
    </div>
  );
}
