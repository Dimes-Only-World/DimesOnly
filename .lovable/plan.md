# Managed Banner Video Controls

## Build
- Use the existing shared banner player for every viewer-facing video loaded from Banner Video Management.
- Show a large centered play button while paused.
- Show play/pause, volume, timeline, fullscreen, and overflow controls while the viewer interacts, then fade them away after inactivity.
- Keep decorative background videos autoplaying without controls where controls would block page content.

## Validation
- Check representative banner pages on desktop and mobile widths.
- Confirm controls fade, return on movement/tap, and fullscreen works.
- Confirm the project remains error-free.

## Technical details
- Consolidate managed interactive videos through the shared `BannerVideo` component rather than changing unrelated user-uploaded videos.
- Preserve age-gate completion behavior while giving its managed explainer the same controls.
