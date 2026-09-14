# Make only the flame on the "i" burn

## What's wrong now

The animated layer is a second copy of the whole FlameFlix picture placed on top of the first one. Animating it moves and brightens the entire word, so "FL" and "X" appear to shift and pulse. In the nav I tried to hide everything but the flame with a rough rectangular crop, which is a guess at where the flame sits rather than a real cut-out.

## What I need from you

Nothing — I can do it from the artwork already in the project. One thing would make the result noticeably better if you have it: a flame picture on its own with a see-through background (a PNG flame, no black box). Otherwise I'll cut the flame out of the existing logos myself.

## The fix

1. Measure the exact position of the flame over the "i" in both logo pictures (the small home logo used in the top corner, and the big flames version used in the opening intro).
2. Cut that flame out as its own small picture with a transparent background, and upload it as a separate asset for each logo.
3. Show the word itself completely still — no movement, no pulsing, no glow.
4. Place the cut-out flame exactly over the "i" and give it real fire motion: several stacked copies of the flame, each drifting, leaning and stretching at slightly different speeds, so the tip wavers continuously instead of the whole thing throbbing. A few small embers rise off the tip and fade.
5. Same treatment on the intro screen: the word stays still, only the flames on the "F" and the "i" move.
6. Anyone with reduced motion turned on sees the still logo.

## Technical notes

- Files: `src/components/flix/FlixLogo.tsx`, `src/components/flix/FlixIntro.tsx`, `src/components/flix/flix.css`, plus two new cropped flame assets under `src/assets/flix/`.
- Crop the flame regions with Python/PIL from the fetched source images, alpha-key the near-black background, upload via `lovable-assets create`, and reference the `.asset.json` pointers.
- Remove `flix-logo-burn` full-image overlay and its `clip-path` hack; base wordmark gets `filter: none` and no transform.
- Flame element: absolutely positioned in percentages derived from the measured crop box, `mix-blend-screen`, 3 stacked layers with `flix-flame-a/b/c` keyframes (skewX + scaleY + translate, 0.9s/1.3s/1.7s, linear, offset delays) and a subtle hue/brightness shimmer — non-synchronised so it never reads as a pulse.
- Embers reuse the existing spark keyframes, anchored to the flame tip.
- `prefers-reduced-motion` disables all flame layers and embers.
