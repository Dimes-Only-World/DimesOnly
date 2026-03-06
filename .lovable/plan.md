

## Plan: Fix Media Upload and Video Playback on Dashboard

### Two Issues Identified

**Issue 1: Videos not playing**
Videos are uploaded to the `private-media` bucket (line 181 of MediaUploadSection.tsx), which is a private bucket requiring signed URLs. However, `MediaGrid.tsx` renders videos using `file.media_url` directly (line 130), which is just a public URL that won't work for private buckets. Other components (ImageCarousel, LatestDimesCarousel, Profile) all generate signed URLs before rendering -- MediaGrid does not.

**Issue 2: Photos can't upload**
The upload logic routes free photos to `user-photos` bucket and silver/gold photos to `public-media` bucket. The `public-media` bucket may not exist or may lack proper RLS policies. Additionally, RLS on the `user_media` table may block inserts for authenticated users.

---

### Changes

**1. Fix video playback in `src/components/MediaGrid.tsx`**
- Add a `useEffect` that processes media items on mount/change
- For any video where `media_url` contains `/private-media/`, extract the storage path and generate a signed URL via `supabase.storage.from("private-media").createSignedUrl(storagePath, 3600)`
- Store resolved URLs in a local state map (`resolvedUrls: Record<string, string>`)
- Use `resolvedUrls[file.id] || file.media_url` as the video `src`

**2. Fix photo uploads in `src/components/MediaUploadSection.tsx`**
- Change the bucket logic: route ALL uploads (photos and videos, all tiers) to the `private-media` bucket. This simplifies storage and ensures consistency with the signed URL pattern already used across the app.
- After upload, store the `storage_path` in the database (already done) and generate the public/signed URL from `private-media`
- This eliminates dependency on potentially non-existent `public-media` and `user-photos` buckets for new uploads

**3. SQL migration to ensure `private-media` bucket policies allow authenticated INSERT**
- Verify/add RLS policy: authenticated users can INSERT into `private-media` bucket under their own username folder
- Verify/add RLS policy: authenticated users can SELECT their own files from `private-media`

### Files Changed
- `src/components/MediaGrid.tsx` — Add signed URL resolution for private-media videos
- `src/components/MediaUploadSection.tsx` — Unify all uploads to `private-media` bucket
- SQL migration — Ensure storage RLS policies for `private-media` allow authenticated user uploads

