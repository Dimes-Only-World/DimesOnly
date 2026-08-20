# Angel Dancing Global Loader

## Goal
Replace the plain "Loading..." text with a dancing angel animation wherever the app shows a global loading state.

## Current state
- The root `Suspense` fallback in `src/main.tsx` renders a black full-screen box with the text `Loading...`.
- `src/components/AgeVerificationWrapper.tsx` also shows a full-screen `Loading...` while auth state initializes.
- Many individual pages/components still use inline `Loading...` text for local async states.

## Plan

1. **Asset handling**
   - Upload the provided `EvrS7.gif` via `lovable-assets create` to the Lovable CDN.
   - Save the resulting pointer as `src/assets/angel-loader.gif.asset.json`.

2. **Create `src/components/AngelLoader.tsx`**
   - Accept a `variant` prop: `"fullscreen"` (default) or `"inline"`.
   - Fullscreen: centered on a dark background, GIF scaled to a sensible max size (e.g., 200px).
   - Inline: smaller inline GIF for use inside cards/tabs.
   - Use the CDN URL from the `.asset.json` pointer.

3. **Replace global loaders**
   - Update `src/main.tsx` `LoadingFallback` to render `<AngelLoader variant="fullscreen" />`.
   - Update `src/components/AgeVerificationWrapper.tsx` loading state to render the fullscreen AngelLoader.

4. **Optional: replace key inline loaders**
   - Swap inline `Loading...` text in high-traffic pages (`Upgrade.tsx`, `Tip.tsx`, `Rate.tsx`, `Jackpot.tsx`, `RentalDetails.tsx`) with `<AngelLoader variant="inline" />` so the experience is consistent.

5. **Verify**
   - Run `bun run build` to confirm no broken imports or missing assets.
   - Check the preview on initial app load to confirm the angel animation appears instead of text.

## Notes
- Format confirmed: transparent GIF.
- Scope confirmed: global loading first; inline page loaders as a secondary pass.
- Asset file `EvrS7.gif` has been provided and is ready for upload.

