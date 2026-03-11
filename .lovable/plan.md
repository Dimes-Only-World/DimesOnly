

# Fix Dimes Directory Page — Use BannerVideo Component

## Problem
The `/dimes` page (`DimesDirectory.tsx`) was missed during the BannerVideo refactor. It still renders a raw `<video>` element (line 305-313) with `autoPlay muted` and no custom controls — inconsistent with every other page.

## Fix
Replace the inline `<video>` block in `DimesDirectory.tsx` (lines 303-315) with the `<BannerVideo>` component.

### File: `src/components/DimesDirectory.tsx`

**Change**: Replace lines 303-315:
```tsx
{dimesVideoUrl && (
  <div className="relative w-full overflow-hidden rounded-lg bg-black">
    <video ...>
      <source src={dimesVideoUrl} type="video/mp4" />
    </video>
  </div>
)}
```

With:
```tsx
{dimesVideoUrl && (
  <BannerVideo src={dimesVideoUrl} className="rounded-lg" />
)}
```

Add `import BannerVideo from "./BannerVideo";` to the imports.

This gives the Dimes Directory page the same YouTube-style controls, tap-to-mute, unmuted autoplay attempt, and translucent overlay as all other pages.

