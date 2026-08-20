# Instagram-Stories-Style Feed Viewer

Keep the existing feed grid exactly as it is. Replace the plain media popup with an immersive Stories-style viewer that matches the uploaded reference.

## What the viewer looks like

- Fullscreen black overlay, media centered in a tall 9:16 card with rounded corners.
- Segmented progress bars across the top: one segment per item, filled segments for viewed, an animating segment for the current one.
- Header row over the media: author avatar, `@username`, time ago, mute/unmute toggle, pause/play toggle, and a `...` menu (placeholder).
- Large close button top-right of the screen.
- Left/right circular chevron buttons for previous/next.
- Blurred, scaled-down previews of the neighbouring items peeking on both sides (as in the reference); hidden on small screens.
- Caption overlaid on the lower part of the media with a soft dark gradient for legibility.

## Behaviour

- Auto-advance: photos hold ~5 seconds, videos play through their full duration and then advance. No expiry — every feed item is in the reel.
- Tap left/right halves of the media (or arrows / keyboard arrows) to move between items; Escape closes.
- Pause button freezes the progress bar and video; mute toggles video audio (videos start muted so autoplay works on iOS).
- Reaching the last item closes the viewer.
- Likes/comments stay on the grid cards; the viewer is view-only.

## Technical notes

- New component `src/components/feed/FeedStoryViewer.tsx` replaces `FeedMediaModal` usage in `src/pages/Feed.tsx`.
- `Feed.tsx` already flattens posts into an ordered `items` array (post + media + author). That flattened list moves up into `Feed.tsx` state so the viewer receives the full list plus the starting index instead of a single URL.
- Signed URLs are fetched lazily per item via the existing `getSignedFeedUrl`, with the current and next item prefetched.
- Video tags use `playsInline`, `muted` by default, `controlsList="nodownload"`, matching the site's iOS/download rules.
- Styling uses existing semantic tokens (`bg-background`, `text-foreground`, `primary`); progress/overlay chrome uses white-on-black inside the fullscreen surface as the reference shows.
- `FeedMediaModal.tsx` is left in place but no longer used by the feed page.
