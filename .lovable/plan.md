

# Fix Upload Video Preview to Match Explainer Video Controls

## Problem
The uploaded video previews in the registration form have a `relative` positioned wrapper div around `BannerVideo`, which creates a competing stacking context. This can cause the centered play button (z-[2]) to be obscured. The explainer videos don't have this extra `relative` wrapper.

Additionally, the remove (X) button at `z-30` sits in this outer `relative` container, which can visually overlap or interfere with BannerVideo's internal layering.

## Fix

### Edit: `src/components/FileUploadField.tsx`
- Remove `relative` from the BannerVideo wrapper div (line 88) — it's not needed since the X button can be positioned relative to a separate wrapper
- Restructure so the remove button is inside its own absolutely-positioned layer that doesn't conflict with BannerVideo's internal z-index stacking
- Change the wrapper from `<div className="relative w-full rounded-lg overflow-hidden">` to `<div className="w-full rounded-lg overflow-hidden">` and wrap everything in a new `relative` parent that keeps the X button above

Specifically:
```tsx
<div className="relative w-full">
  <div className="w-full rounded-lg overflow-hidden">
    <BannerVideo src={preview!} loop={false} />
  </div>
  <button ... className="absolute top-2 right-2 z-50 ..." />
</div>
```

This ensures:
1. BannerVideo's internal stacking (play button z-[2], controls z-[3]) works without interference from `overflow-hidden` on the same relative container
2. The X button floats above everything
3. Both videos look identical — same component, same controls, same centered play button

### Files
1. **Edit**: `src/components/FileUploadField.tsx` — restructure video preview wrapper

