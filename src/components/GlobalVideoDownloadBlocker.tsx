import { useEffect } from "react";

/**
 * Global <video> normalizer.
 *
 * 1. Removes download / PiP / AirPlay affordances (site-wide policy).
 * 2. Applies the attributes iOS Safari requires for reliable playback:
 *    - playsinline + webkit-playsinline (otherwise iOS force-fullscreens)
 *    - muted autoplay videos are muted at the property level (attribute alone
 *      is not enough when React sets it after mount)
 *    - preload="metadata" for autoplay videos so the first frame paints
 * 3. Retries blocked autoplay on the first user gesture and when the tab or
 *    bfcache page becomes visible again (iOS pauses aggressively).
 */

function patchVideo(video: HTMLVideoElement) {
  // --- download / PiP hardening (runs once) ---
  if (video.dataset.downloadBlocked !== "true") {
    video.dataset.downloadBlocked = "true";
    video.setAttribute("controlsList", "nodownload");
    video.setAttribute("disablePictureInPicture", "");
    video.setAttribute("disableRemotePlayback", "");
  }

  // --- iOS inline playback (idempotent, cheap) ---
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "true");
  video.playsInline = true;

  const wantsAutoplay = video.autoplay || video.hasAttribute("autoplay");
  if (wantsAutoplay) {
    // iOS only autoplays muted video.
    video.muted = true;
    video.setAttribute("muted", "");
    if (!video.getAttribute("preload")) video.setAttribute("preload", "metadata");
  }
}

function resumeAutoplayVideos() {
  document.querySelectorAll<HTMLVideoElement>("video[autoplay]").forEach((video) => {
    if (!video.paused || video.ended) return;
    video.muted = true;
    const attempt = video.play();
    if (attempt && typeof attempt.catch === "function") attempt.catch(() => undefined);
  });
}

export default function GlobalVideoDownloadBlocker() {
  useEffect(() => {
    document.querySelectorAll("video").forEach(patchVideo);

    // Watch for dynamically injected videos (modals, carousels, lazy routes).
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLVideoElement) {
            patchVideo(node);
          } else if (node instanceof HTMLElement) {
            node.querySelectorAll("video").forEach(patchVideo);
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // iOS blocks autoplay until a gesture, and pauses on tab/app switch.
    const onGesture = () => resumeAutoplayVideos();
    const onVisibility = () => {
      if (document.visibilityState === "visible") resumeAutoplayVideos();
    };
    const onPageShow = () => {
      document.querySelectorAll("video").forEach(patchVideo);
      resumeAutoplayVideos();
    };

    document.addEventListener("touchstart", onGesture, { passive: true });
    document.addEventListener("click", onGesture, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      observer.disconnect();
      document.removeEventListener("touchstart", onGesture);
      document.removeEventListener("click", onGesture);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return null;
}
