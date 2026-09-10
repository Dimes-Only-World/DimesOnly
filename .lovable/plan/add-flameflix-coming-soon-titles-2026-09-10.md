# Add FlameFlix “Coming Soon” Titles

## What will change
- Add a **Coming Soon!** checkbox beside **FlameFlix Original** in the admin title editor.
- Save that setting with each FlameFlix title and show it in the admin title list.
- Display a polished **COMING SOON** badge on matching poster cards and featured banners across `/flix`.
- Replace watch/preview actions on a coming-soon featured banner with a disabled release-status treatment, preventing users from opening unavailable video playback from the banner.

## Technical details
- Add a `coming_soon` boolean to FlameFlix titles with a safe `false` default.
- Pass the field through the existing privileged FlameFlix admin function and frontend title type.
- Keep existing live/draft publishing behavior unchanged; “Coming Soon” remains a separate display state.
- Deploy the updated admin function, then verify the app build and public FlameFlix rendering.
