

## Plan: Show Photos at Full/Original Size in Admin User Details

### Problem
In the admin dashboard user details modal, profile photos, banner photos, front page photos, and uploaded media are all constrained to small fixed heights (`h-32` for profile images, `h-40 md:h-48` for media grid). Photos should display at their natural aspect ratio so the admin sees them as they were uploaded.

### Changes

**Edit `src/components/AdminUserDetailsEnhanced.tsx`**

1. **Profile/Banner/Front Page photos (lines 201-225)**: Change from `h-32 object-cover` to `object-contain max-h-96` so images show at their natural proportions without cropping, up to a reasonable max height.

2. **Uploaded media grid (lines 258-264)**: Change from `h-40 md:h-48 object-cover` to `object-contain max-h-[500px]` so uploaded photos render at their full uploaded proportions. Remove fixed height constraint.

3. **Expanded image dialog (lines 340-345)**: Already uses `max-h-[70vh] object-contain` which is good — keep as is.

### Files Changed
- `src/components/AdminUserDetailsEnhanced.tsx`

