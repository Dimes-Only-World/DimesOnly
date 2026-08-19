import { useEffect } from "react";

const BLOCK_ATTRS = {
  controlsList: "nodownload",
  disablePictureInPicture: true,
  disableRemotePlayback: true,
} as const;

function patchVideo(video: HTMLVideoElement) {
  if (video.dataset.downloadBlocked === "true") return;
  video.dataset.downloadBlocked = "true";

  // Remove the native download button from the control bar.
  video.setAttribute("controlsList", BLOCK_ATTRS.controlsList);
  // Disable PiP and remote playback menus that can expose download/share options.
  video.setAttribute("disablePictureInPicture", "");
  video.setAttribute("disableRemotePlayback", "");
}

export default function GlobalVideoDownloadBlocker() {
  useEffect(() => {
    // Patch every <video> already in the DOM.
    document.querySelectorAll("video").forEach(patchVideo);

    // Watch for dynamically injected videos (modals, carousels, lazy routes, etc.).
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

    return () => observer.disconnect();
  }, []);

  return null;
}
