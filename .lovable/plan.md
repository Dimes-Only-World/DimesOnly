

## Plan: Integrate New Landing Page

### Summary
- Fix build errors by excluding `src/components/landing` from TypeScript compilation
- Create new `src/pages/NewIndex.tsx` using landing components + preserved existing components
- Move current landing page to `/failsafe` route
- Apply #E916D1 / #000000 / #f4f6f8 color theme to landing CSS
- Replace landing HeroBanner placeholder video with the FullWidthVideo S3 URLs

### Preserved Components (not touched at all)
- `AgeVerification` + `AgeVerificationWrapper` -- existing, unchanged
- `LatestDimesCarousel` -- existing `src/components/LatestDimesCarousel.tsx`, unchanged
- `PositionCounter` -- existing "Incentive positions available now" section, unchanged
- `ImageCarousel` -- existing "VIEW CURRENT TOP 20 RANKED" section, unchanged

### Step 1: Fix build errors
Add `"exclude": ["src/components/landing"]` to `tsconfig.app.json`. This stops the main compiler from processing the sub-project's files (vitest, tests, duplicate `@/` paths).

### Step 2: Create `src/pages/NewIndex.tsx`
New page combining landing components (via relative imports) with preserved existing components in this order:

1. **HeroBanner** (from landing, modified to use FullWidthVideo S3 URLs)
2. **ReferrerProfile** (from landing)
3. **GetStartedSteps** (from landing)
4. **ReadyToStart** (from landing)
5. **LatestDimesCarousel** (existing -- unchanged)
6. **PositionCounter** (existing -- "Incentive positions available now" + "3 Easy Steps" section, unchanged)
7. **ImageCarousel** (existing -- "VIEW CURRENT TOP 20 RANKED", unchanged)
8. **SecurePlatform** (from landing)
9. **LandingFooter** (from landing)

### Step 3: Update landing HeroBanner video
Edit `src/components/landing/src/components/HeroBanner.tsx`:
- Remove local `hero-video.mp4` / `hero-bg.jpg` imports
- Use responsive video with two sources:
  - Desktop: `https://dimesonlyworld.s3.us-east-2.amazonaws.com/HOME+PAGE+16-9+1080+CINEMA.webm`
  - Mobile: `https://dimesonlyworld.s3.us-east-2.amazonaws.com/HOME+PAGE+9-16+1080+FINAL.webm`
- Keep the same layout/structure, just swap the video source

### Step 4: Apply color theme to landing CSS
Edit `src/components/landing/src/index.css` CSS variables:
- `--primary`: HSL equivalent of #E916D1 (magenta) → `312 87% 50%`
- `--background`: `0 0% 0%` (pure black)
- `--foreground`: `210 20% 97%` (#f4f6f8)
- `--primary-light`: lighter magenta variant
- `--primary-bright`: brighter magenta variant
- `--primary-muted`: muted magenta variant
- `--accent`: match primary (magenta)
- `--card`: dark card bg
- `--border`, `--input`: dark borders
- Update both `:root` and `.dark` blocks

### Step 5: Update routes in `src/App.tsx`
- Import `NewIndex` from `@/pages/NewIndex`
- Change `"/"` route to render `<NewIndex />`
- Add `"/failsafe"` route rendering the current `<Index />` (old landing page)
- Keep `AgeVerificationWrapper` logic working for both `/` and `/failsafe`

### Step 6: Update `AgeVerificationWrapper` check
In `AppContent`, update `isHomePage` to also include `/failsafe`:
```
const isHomePage = location.pathname === "/" || location.pathname === "/failsafe";
```

### Technical Notes
- Landing components use `@/components/ui/*` which resolves to the main project's shadcn UI components (same library) -- this works correctly
- Landing components using `react-router-dom` (`Link`, `useSearchParams`) will work since they're rendered inside the main app's `<Router>`
- The `PositionCounter` component contains BOTH the "Incentive positions available now" cards AND the "3 Easy Steps" section -- both are preserved as-is
- The landing's `IncentivePositions` and `GetStartedSteps` will NOT replace the existing ones since those are inside `PositionCounter`

