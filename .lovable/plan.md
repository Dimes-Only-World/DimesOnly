

## Plan: Make Front Page Photo Squared

**Edit `src/components/landing/src/components/ReferrerProfile.tsx`**

Change the image container from `rounded-full` to `rounded-lg` (lines ~53-54) to make it squared with slight rounding instead of circular. Also increase the size from `w-28 h-28` to `w-64 h-64` as previously discussed, and update the Supabase query to fetch `front_page_photo` with fallback priority: `front_page_photo > profile_photo > defaultAvatar`.

### Files Changed
- `src/components/landing/src/components/ReferrerProfile.tsx`

