

# Remove All Hardcoded Fallback Video URLs from Banner Videos

## Files with hardcoded S3 banner video URLs to remove

| File | Hardcoded URLs | Fix |
|---|---|---|
| `src/components/HeroBanner.tsx` | Lines 12-13: phone + desktop S3 URLs | Use `usePageVideo("home_hero_desktop")` and `usePageVideo("home_hero_mobile")` |
| `src/components/HeroSlide.tsx` | Lines 15-16: phone + desktop S3 URLs | Use `usePageVideo` or remove entirely (this component may be unused) |
| `src/components/ProfileVideoSection.tsx` | Line 16: `BG_VIDEO_SRC` constant | Use `usePageVideo("home_background")` |
| `src/pages/Index.tsx` | Lines 71-72: S3 URLs passed to `FullWidthVideo` | Use `usePageVideo("home_fullwidth_desktop")` and `usePageVideo("home_fullwidth_mobile")` |
| `src/components/landing/src/components/HeroBanner.tsx` | Lines 16-17: desktop + mobile S3 URLs | Use `usePageVideo("home_hero_desktop")` / `usePageVideo("home_hero_mobile")` |

## New page_keys needed in `page_videos` table

These keys need to be inserted into the database so the admin can manage them:
- `home_hero_desktop` — Home page hero video (desktop)
- `home_hero_mobile` — Home page hero video (mobile)
- `home_fullwidth_desktop` — Home page full-width video (desktop)
- `home_fullwidth_mobile` — Home page full-width video (mobile)
- `home_background` — Home page background ladies video

## Database migration

Insert initial rows into `page_videos` for the new keys (with the current S3 URLs as starting values so nothing breaks, but no hardcoded fallbacks in code).

## Approach per file

- **HeroBanner.tsx**: Replace hardcoded `phoneSrc`/`desktopSrc` with `usePageVideo` hooks. If no URL from DB, don't render the video section.
- **HeroSlide.tsx**: Same pattern — pull from DB, render nothing if no URL.
- **ProfileVideoSection.tsx**: Replace `BG_VIDEO_SRC` constant with `usePageVideo("home_background")`. Show black bg if no URL.
- **Index.tsx**: Use `usePageVideo` for both desktop/mobile URLs passed to `FullWidthVideo`. Don't render `FullWidthVideo` if no URL.
- **landing/HeroBanner.tsx**: Use `usePageVideo` (import supabase client). Don't render video if no URL.

