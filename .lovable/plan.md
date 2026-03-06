

## Plan: Fix Admin User Details Media Display

### Root Causes

1. **`supabaseAdmin` is removed** — This component imports `supabaseAdmin` from `@/lib/supabase`, which was removed and now throws an error on any access. This means `fetchUserMedia`, `handleFlagMedia`, and `handleDeactivateUser` all silently fail.

2. **Private media needs signed URLs** — Media stored in `private-media` bucket requires signed URLs, but the component renders `item.url` directly.

### Changes

**Edit `src/components/AdminUserDetailsEnhanced.tsx`:**

- Replace `supabaseAdmin` import with `supabase` (regular client)
- Route all three operations (`fetchUserMedia`, `handleFlagMedia`, `handleDeactivateUser`) through the `admin-data` edge function, consistent with the pattern used in `AdminUsersListEnhanced`
- Add a new `admin-data` action: `fetchUserMedia` (fetch media by user ID) and `flagUserMedia` (flag media by ID)
- After fetching media, resolve signed URLs for any items stored in `private-media` bucket using `supabase.storage.from('private-media').createSignedUrl()`
- Store resolved URLs in state and use them for rendering images and videos

**Edit `supabase/functions/admin-data/index.ts`:**

- Add `fetchUserMedia` action: queries `user_media` table for a given user ID
- Add `flagUserMedia` action: updates `flagged` and `warning_message` on a media record
- These use the service role client server-side, bypassing RLS safely

