import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Users, Home } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import { useAppContext } from "@/contexts/AppContext";
import { fetchFeed, FeedPostRow, FeedMediaRow } from "@/lib/feedApi";
import FeedPostCard from "@/components/feed/FeedPostCard";
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

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .rpc("get_my_referrals_count")
      .then(({ data }) => setCircleCount(Number(data) || 0));
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
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
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

        <div className="max-w-2xl mx-auto px-4 py-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="all">Everyone</TabsTrigger>
              <TabsTrigger value="circle" className="gap-2">
                <Users className="w-4 h-4" /> Money Circle
                <span className="ml-1 text-xs bg-primary/20 text-primary rounded-full px-1.5">{circleCount}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <FeedList loading={loading} posts={posts} media={media} authors={authors} />
            </TabsContent>
            <TabsContent value="circle" className="mt-4">
              <div className="mb-3 p-3 rounded-lg bg-card border border-border">
                <h2 className="font-semibold text-foreground">Your Money Circle</h2>
                <p className="text-sm text-muted-foreground">
                  Posts from the {circleCount} {circleCount === 1 ? "person" : "people"} you referred.
                </p>
              </div>
              <FeedList loading={loading} posts={posts} media={media} authors={authors} emptyLabel="No posts from your circle yet." />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AuthGuard>
  );
}

function FeedList({
  loading,
  posts,
  media,
  authors,
  emptyLabel = "No posts yet — be the first to create one!",
}: {
  loading: boolean;
  posts: FeedPostRow[];
  media: FeedMediaRow[];
  authors: any[];
  emptyLabel?: string;
}) {
  if (loading) return <p className="text-center text-muted-foreground py-12">Loading feed…</p>;
  if (posts.length === 0) return <p className="text-center text-muted-foreground py-12">{emptyLabel}</p>;
  const authorMap = new Map(authors.map((a) => [a.id, a]));
  return (
    <div>
      {posts.map((p) => (
        <FeedPostCard
          key={p.id}
          post={p}
          media={media.filter((m) => m.post_id === p.id)}
          author={authorMap.get(p.user_id)}
        />
      ))}
    </div>
  );
}
