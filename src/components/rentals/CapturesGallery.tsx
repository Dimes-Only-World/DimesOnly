import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Star, Trophy } from "lucide-react";

type Capture = {
  id: string;
  storage_path: string;
  media_type: string;
  caption: string | null;
  is_featured: boolean;
  contest_id: string | null;
  created_at: string;
  signedUrl?: string;
};

const CapturesGallery: React.FC<{ vehicleId?: string; limit?: number }> = ({ vehicleId, limit = 12 }) => {
  const [items, setItems] = useState<Capture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        let query = (supabase as any)
          .from("rental_captures")
          .select("id, storage_path, media_type, caption, is_featured, contest_id, created_at")
          .eq("moderation_status", "approved")
          .order("is_featured", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(limit);
        if (vehicleId) query = query.eq("vehicle_id", vehicleId);
        const { data, error } = await query;
        if (error) throw error;
        const withUrls = await Promise.all(
          (data || []).map(async (c: Capture) => {
            const { data: s } = await supabase.storage
              .from("rental-captures")
              .createSignedUrl(c.storage_path, 60 * 60);
            return { ...c, signedUrl: s?.signedUrl };
          }),
        );
        setItems(withUrls);
      } catch (e) {
        console.error("Load captures failed", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [vehicleId, limit]);

  if (loading) return null;
  if (!items.length) return null;

  return (
    <section className="mt-10">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="text-2xl font-semibold">Community Captures</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((c) => (
          <Card
            key={c.id}
            className="relative overflow-hidden bg-card/60 border-border/60 hover:border-primary/50 transition-colors group"
          >
            <div className="aspect-square bg-muted">
              {c.media_type === "video" ? (
                import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Star, Trophy } from "lucide-react";

type Capture = {
  id: string;
  storage_path: string;
  media_type: string;
  caption: string | null;
  is_featured: boolean;
  contest_id: string | null;
  created_at: string;
  signedUrl?: string;
};

const CapturesGallery: React.FC<{ vehicleId?: string; limit?: number }> = ({ vehicleId, limit = 12 }) => {
  const [items, setItems] = useState<Capture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        let query = (supabase as any)
          .from("rental_captures")
          .select("id, storage_path, media_type, caption, is_featured, contest_id, created_at")
          .eq("moderation_status", "approved")
          .order("is_featured", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(limit);
        if (vehicleId) query = query.eq("vehicle_id", vehicleId);
        const { data, error } = await query;
        if (error) throw error;
        const withUrls = await Promise.all(
          (data || []).map(async (c: Capture) => {
            const { data: s } = await supabase.storage
              .from("rental-captures")
              .createSignedUrl(c.storage_path, 60 * 60);
            return { ...c, signedUrl: s?.signedUrl };
          }),
        );
        setItems(withUrls);
      } catch (e) {
        console.error("Load captures failed", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [vehicleId, limit]);

  if (loading) return null;
  if (!items.length) return null;

  return (
    <section className="mt-10">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="text-2xl font-semibold">Community Captures</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((c) => (
          <Card
            key={c.id}
            className="relative overflow-hidden bg-card/60 border-border/60 hover:border-primary/50 transition-colors group"
          >
            <div className="aspect-square bg-muted">
              {c.media_type === "video" ? (
                <video src={c.signedUrl} className="w-full h-full object-cover" muted loop playsInline / controlsList="nodownload" disablePictureInPicture disableRemotePlayback>
              ) : (
                <img
                  src={c.signedUrl}
                  alt={c.caption || "Capture"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              )}
            </div>
            {c.is_featured && (
              <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" /> Featured
              </div>
            )}
            {c.contest_id && (
              <div className="absolute top-2 right-2 bg-amber-500 text-black text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                <Trophy className="w-3 h-3" /> Contest
              </div>
            )}
            {c.caption && (
              <CardContent className="p-2">
                <p className="text-xs text-muted-foreground line-clamp-2">{c.caption}</p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
};

export default CapturesGallery;

              ) : (
                <img
                  src={c.signedUrl}
                  alt={c.caption || "Capture"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              )}
            </div>
            {c.is_featured && (
              <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" /> Featured
              </div>
            )}
            {c.contest_id && (
              <div className="absolute top-2 right-2 bg-amber-500 text-black text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                <Trophy className="w-3 h-3" /> Contest
              </div>
            )}
            {c.caption && (
              <CardContent className="p-2">
                <p className="text-xs text-muted-foreground line-clamp-2">{c.caption}</p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
};

export default CapturesGallery;
