import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import placeholderLady from "../../../../assets/weo.png";

const supabaseUrl = "https://qkcuykpndrolrewwnkwb.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrY3V5a3BuZHJvbHJld3dua3diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzODIwNzAsImV4cCI6MjA2NDk1ODA3MH0.gamp40tIrDSMaI5_YMIrn3qCR-oVdx__YtvBl75yOJs";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const HeroBanner = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [desktopSrc, setDesktopSrc] = useState<string | null>(null);
  const [mobileSrc, setMobileSrc] = useState<string | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const { data } = await supabase
          .from("page_videos")
          .select("page_key, video_url")
          .in("page_key", ["home_hero_desktop", "home_hero_mobile"]);
        if (data) {
          for (const row of data) {
            if (row.page_key === "home_hero_desktop" && row.video_url) setDesktopSrc(row.video_url);
            if (row.page_key === "home_hero_mobile" && row.video_url) setMobileSrc(row.video_url);
          }
        }
      } catch {
        // no fallback
      }
    };
    fetchVideos();
  }, []);

  const videoSrc = isMobile ? mobileSrc : desktopSrc;

  const scrollDown = () => {
    const next = document.getElementById("referrer-section");
    next?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black">
      {/* Fallback image */}
      <img
        src={placeholderLady}
        alt="Hero background"
        className="absolute inset-0 w-full h-full object-cover object-center"
      />

      {/* Hero Video */}
      {videoSrc && (
        <video
          key={videoSrc}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          playsInline
          loop
          preload="metadata"
        >
          <source src={videoSrc} type="video/webm" />
        </video>
      )}

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Translucent gradient for CTA visibility over media */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />

      {/* Content */}
      <div className="relative z-10 text-center px-4">
      </div>
    </section>
  );
};

export default HeroBanner;
