

# Custom YouTube-Style Video Player with Tap-to-Mute

## Behavior

- Videos autoplay **with sound** (unmuted). Browsers will block this, so the video simply won't autoplay if the browser refuses — it does NOT fall back to muted automatically.
- **Tapping anywhere on the video toggles mute/unmute** (not play/pause).
- Play/pause is controlled only via the control bar button.
- Custom YouTube-style control bar: play/pause, seekbar, time, volume icon, fullscreen.
- Controls auto-hide after 3 seconds, reappear on hover/tap.
- Slight translucent overlay (`bg-black/20`) over the video.

## New File: `src/components/BannerVideo.tsx`

A reusable component with these props:
- `src: string` — video URL
- `loop?: boolean` (default true)
- `className?: string`
- `overlay?: boolean` (default true)

Internals:
- `<video>` with `autoPlay playsInline` and `muted={false}` — let the browser decide if it plays
- Tap/click on the video area calls `video.muted = !video.muted` (toggle mute, never pause)
- Custom control bar at bottom: `bg-black/60 backdrop-blur-sm`, auto-hides after 3s idle
- Controls: play/pause button, progress bar (styled range input), time display, mute icon (shows current state), fullscreen button
- A translucent `bg-black/20 pointer-events-none` overlay div
- `key={src}` on the video element to force re-mount when URL changes

## Files Modified

| File | Change |
|---|---|
| `src/components/BannerVideo.tsx` | **New** — custom player component |
| `src/pages/TipGirls.tsx` | Replace inline `<video>` block (lines 234-249) with `<BannerVideo src={tipVideoUrl} />` |
| `src/pages/RateGirls.tsx` | Replace inline `<video>` block (lines 190-204) with `<BannerVideo src={rateVideoUrl} />` |
| `src/pages/EventsDimes.tsx` | Replace inline `<video>` block (lines 184-198) with `<BannerVideo src={eventsMaleVideoUrl} />` |
| `src/pages/EventsDimesOnly.tsx` | Replace inline `<video>` block (lines 785-796) with `<BannerVideo src={eventsDimesVideoUrl} />` |
| `src/components/DashboardVideoHeader.tsx` | Replace native `<video>` with `<BannerVideo>` |
| `src/components/HeroBanner.tsx` | Replace desktop/mobile `<video>` elements with `<BannerVideo>` |
| `src/components/FullWidthVideo.tsx` | Replace internal `<video>` elements with `<BannerVideo>` |
| `src/components/ProfileVideoSection.tsx` | Replace background `<video>` elements with `<BannerVideo>` (loop, no controls needed for background) |

## Control Bar Layout

```text
┌──────────────────────────────────────────────┐
│              [video + dark overlay]          │
│     (tap anywhere = toggle mute/unmute)      │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ ▶  ━━━━━━━━━●━━━━━━━━  1:23/3:45  🔊 ⛶│  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

