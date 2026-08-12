# Fix: Background carousel video shows a play button on iPhone

## What's happening

On the short-form background carousel, iOS Safari is refusing to autoplay the video and instead paints its native play overlay on top of the background. The current video element in `src/components/ShortFormBackgroundCarousel.tsx` sets `autoPlay muted playsInline`, but on iOS that isn't enough:

- React applies `muted` as a DOM property after the element mounts. iOS evaluates the mute state at load time, so the video can be treated as unmuted and blocked from autoplay.
- The `<source>` tag has no `type` attribute, so Safari may not commit to loading the file.
- When autoplay is blocked (including Low Power Mode), nothing recovers the playback, so the paused frame plus the native play control stays on screen.

## The fix

All changes stay in `src/components/ShortFormBackgroundCarousel.tsx`.

1. Force the muted state before playback: set `muted`, `defaultMuted`, and `volume = 0` directly on the video element via the ref as soon as the current video mounts, in addition to the JSX attributes.
2. Add iOS-specific attributes: `webkit-playsinline`, `x5-playsinline`, `controls={false}`, and `disablePictureInPicture` so Safari never renders native chrome over the background.
3. Kick off playback explicitly: call `video.play()` in an effect keyed to the current item and catch the promise rejection instead of letting it fail silently.
4. Add a blocked-autoplay fallback: if `play()` rejects (Low Power Mode, or a policy block), treat the item like a failed one and advance the carousel to the next media item so the user always sees moving/complete artwork instead of a frozen frame with a play button.
5. Add a one-time unblock listener: on the first user touch/scroll anywhere on the page, retry `play()` on the active video, since iOS grants autoplay after a gesture.
6. Give the `<source>` an explicit `type` derived from the file extension (mp4, webm, mov) so Safari loads the right decoder.

## Notes

- No database, admin, or layout changes — the admin preview and the age-gate background both use this same component and inherit the fix.
- Verification: build the project, then confirm the carousel still cycles images and videos in the preview.
