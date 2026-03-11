import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function usePageVideo(pageKey: string) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data, error } = await supabase
          .from("page_videos")
          .select("video_url")
          .eq("page_key", pageKey)
          .single();

        if (!error && data?.video_url) {
          setVideoUrl(data.video_url);
        }
      } catch {
        // keep fallback
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [pageKey]);

  return { videoUrl, loading };
}
