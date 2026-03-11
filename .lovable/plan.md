

# Stop Autoplay & Add Center Play Button to BannerVideo

## Changes — Single file: `src/components/BannerVideo.tsx`

### 1. Remove autoplay logic
- Delete the `useEffect` (lines 39-57) that calls `video.play()` on mount
- Video starts paused — user must tap to play

### 2. Add large center play button
- When video is paused, show a large semi-transparent circular play button centered on the video
- Clicking it starts playback (and hides the button)
- Style: `bg-black/50 rounded-full p-4` with a white Play icon (~48px)
- The button fades out when playing, fades in when paused

### 3. Change tap-on-video behavior
- Currently tapping the video toggles mute — change it to toggle play/pause instead (more intuitive now that autoplay is gone)
- Mute/unmute remains available via the control bar volume button

### 4. Background mode
- Remove `autoPlay` from the background-mode `<video>` too (line 147) — background videos also start paused with the center play button... 

Actually, background videos (used for decorative bg) should probably still autoplay muted. Let me reconsider.

**Decision**: Background-mode videos will keep `autoPlay muted` since they're decorative. Only the banner player (with controls) stops autoplay and gets the center play button.

### Layout

```text
┌──────────────────────────────────────────────┐
│                                              │
│              ┌───────────┐                   │
│              │  ▶ (big)  │                   │
│              └───────────┘                   │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ ▶  ━━━━━━━━━●━━━━━━━━  0:00/3:45  🔊 ⛶│  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

### Summary of changes in `BannerVideo.tsx`
- Remove autoplay `useEffect`
- Add `hasStarted` state (false initially) — center play button shows when `!isPlaying`
- Center play button: clicking it plays the video
- Tap on video area: toggle play/pause (was toggle mute)
- Control bar play/pause and volume buttons unchanged
- Background mode: keep `autoPlay muted` as-is

