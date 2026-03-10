

# Fix All Banner Videos with Fixed Heights

## Pages to fix (4 total)

### 1. `src/pages/Tip.tsx` (lines 759-769)
- Video container: `h-64 md:h-80` with `object-cover` → change to `w-full bg-black` container, `w-full h-auto` video
- Banner photo fallback (line 771): keep fixed height for static images (only fix videos)

### 2. `src/pages/Events.tsx` (line 376)
- Container: `h-72 md:h-96 lg:h-[550px]` with `object-cover` → `w-full bg-black`, video `w-full h-auto`
- Keep fallback image styling as-is

### 3. `src/pages/RateGirls.tsx` (lines 190-205)
- Uses `paddingBottom: 56.25%` hack with `absolute inset-0` and `object-cover` → replace with simple `w-full bg-black` container, `w-full h-auto` video

### 4. `src/pages/EventDetails.tsx` (lines 604-627)
- Container: `h-64 md:h-80` with absolute positioned `object-cover` video → `w-full bg-black`, video `w-full h-auto`
- Keep the play button overlay and click handler

## Pattern applied (matches TipGirls/EventsDimes)
```tsx
<div className="w-full bg-black">
  <video className="w-full h-auto" autoPlay muted loop playsInline>
    <source src={videoUrl} type="video/mp4" />
  </video>
</div>
```

All four pages will use the same responsive pattern already established in TipGirls and EventsDimes pages.

