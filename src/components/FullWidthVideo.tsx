import React from "react";

interface FullWidthVideoProps {
  // Preferred: separate sources for desktop and mobile
  srcDesktop?: string;
  srcMobile?: string;

  // Backward-compatible single source (used if the above are not provided)
  src?: string;

  // Optional posters
  posterDesktop?: string;
  posterMobile?: string;

  className?: string;

  // Optional controls
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
}

function mimeFromUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const lower = url.toLowerCase();
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".ogg") || lower.endsWith(".ogv")) return "video/ogg";
  return undefined;
}

const FullWidthVideo: React.FC<FullWidthVideoProps> = ({
  srcDesktop,
  srcMobile,
  src,
  posterDesktop,
  posterMobile,
  className = "",
  autoPlay = true,
  loop = true,
  muted = true,
  playsInline = true,
}) => {
  // Fallback to legacy single source if desktop/mobile not provided
  const single = src && !srcDesktop && !srcMobile ? src : undefined;
  const poster = posterDesktop || posterMobile;

  return (
    <div className={`relative w-screen bg-black ${className}`}>
      <video
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        playsInline={playsInline}
        preload="metadata"
        poster={poster}
        className="block w-screen max-h-[100vh] object-contain mx-auto"
        style={{ width: "100vw" }}
      >
        {/* Prefer mobile video on portrait orientation OR narrow screens */}
        {srcMobile && (
          <>
            <source
              src={srcMobile}
              type={mimeFromUrl(srcMobile)}
              media="(orientation: portrait)"
            />
            <source
              src={srcMobile}
              type={mimeFromUrl(srcMobile)}
              media="(max-width: 768px)"
            />
          </>
        )}

        {/* Prefer desktop video on landscape or wider screens */}
        {srcDesktop && (
          <>
            <source
              src={srcDesktop}
              type={mimeFromUrl(srcDesktop)}
              media="(orientation: landscape)"
            />
            <source
              src={srcDesktop}
              type={mimeFromUrl(srcDesktop)}
              media="(min-width: 769px)"
            />
          </>
        )}

        {/* Legacy single source fallback */}
        {single && <source src={single} type={mimeFromUrl(single)} />}

        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default FullWidthVideo;