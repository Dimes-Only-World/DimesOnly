

# Add Approval Email Video Management to Admin Videos Tab

## What it does
Adds a new section in the Admin Dashboard "Videos" tab where admins can configure which video URLs are included in the approval and rejection emails sent to exotic/stripper performers. Currently these are hardcoded in the edge function.

## Implementation

### 1. Add two new page_key entries to `AdminBannerVideoTab.tsx`
Add to the `PAGE_VIDEO_CONFIG` array:
- `{ page_key: "email_performer_approved", label: "Email — Performer Approved Video" }`
- `{ page_key: "email_performer_not_approved", label: "Email — Performer Not Approved Video" }`

These will use the same existing video management UI (input, save, history, preview) already built in the Videos tab.

### 2. Update `admin-data/index.ts` — `approvePerformer` action
Instead of the hardcoded `Vid3o.mp4` URL, fetch the video URL from the `page_videos` table using page_key `email_performer_approved`. Fall back to the current hardcoded URL if no entry exists.

### 3. Update `admin-data/index.ts` — `rejectPerformer` action
Same pattern: fetch video URL from `page_videos` using page_key `email_performer_not_approved`. Fall back to the current hardcoded URL if no entry exists.

### Files changed
1. **Edit**: `src/components/AdminBannerVideoTab.tsx` — add 2 entries to config array
2. **Edit**: `supabase/functions/admin-data/index.ts` — dynamic video URLs in both email actions
3. **Deploy**: redeploy `admin-data` edge function

