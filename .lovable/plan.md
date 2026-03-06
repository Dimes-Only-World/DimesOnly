

## Plan: Show Photos at Full Uploaded Size

### Issue 1: Admin User Details Photos Still Constrained

The photos are in a 3-column grid (`grid-cols-3`) with `max-h-96`, which limits their display size. The uploaded screenshots show the image preview dialog works well (image 3), but the inline photos in the details view are still small.

**Edit `src/components/AdminUserDetailsEnhanced.tsx`**:
- Change the photo grid from `grid-cols-1 md:grid-cols-3` to `grid-cols-1` so each photo gets the full width
- Remove `max-h-96` constraint, replace with just `w-full object-contain` so photos render at their natural aspect ratio with no height cap
- For uploaded media grid: change from 4-column to 2-column max (`grid-cols-1 md:grid-cols-2`) and remove `max-h-[500px]` so each media item shows full size

### Issue 2: Referrer Profile Photo on Landing Page Cropped

The container is fixed at `w-64 h-64` with `object-cover`, which crops the image to a square. The screenshot (image 2) shows it cropped.

**Edit `src/components/landing/src/components/ReferrerProfile.tsx`**:
- Remove fixed `w-64 h-64` from the container div
- Use `max-w-sm w-full` instead so it takes available width up to a reasonable max
- Change `object-cover` to `object-contain` on the img, or remove height constraint entirely and let the image show at natural proportions
- Remove `h-full` from the img tag so it renders at its natural height

### Files Changed
- `src/components/AdminUserDetailsEnhanced.tsx`
- `src/components/landing/src/components/ReferrerProfile.tsx`

