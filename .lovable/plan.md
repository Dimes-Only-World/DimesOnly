
## Full Analysis

### Current State Summary

**Dashboard Videos (hardcoded):**
- `UserDashboard.tsx` lines 406-409: `heroVideoUrl` is a ternary - stripper/exotic get `Dimes+Dashboard.webm`, everyone else gets `home+page.mp4`. These are hardcoded S3 URLs used in `DashboardVideoHeader`.

**Page Banners (hardcoded):**
- `RateGirls.tsx` lines 189-200: hardcoded video with text overlay on top of video
- `EventsDimes.tsx` lines 182-196: hardcoded video, text overlaid on top
- `EventsDimesOnly.tsx`: has a banner video section (need to verify exact lines)
- `Tip.tsx` line 756: only shows `banner_photo` image, **no video**
- `DimesDirectory.tsx`: no banner video at all

**Database:** No existing `app_settings` or similar config table. Will need to create one.

### Plan

#### Step 1 — Database Migration
Create a `page_videos` table to store admin-managed video URLs per page/section:

```sql
CREATE TABLE public.page_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text UNIQUE NOT NULL,  -- e.g. 'dashboard_male', 'dashboard_dimes', 'tip_page', etc.
  video_url text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

-- Enable RLS
ALTER TABLE public.page_videos ENABLE ROW LEVEL SECURITY;

-- Anyone can read (pages need to load the video)
CREATE POLICY "public_read_page_videos" ON public.page_videos FOR SELECT USING (true);

-- Only admins can write (via service role in edge function)
-- No direct client write policy needed — writes go through admin-data edge function
```

Page keys to seed:
- `dashboard_male`
- `dashboard_dimes`
- `tip_win_page`
- `rate_page`
- `dimes_directory_page`
- `events_male_page`
- `events_dimes_page`

#### Step 2 — New Admin Tab: `AdminBannerVideoTab.tsx`

A new component `src/components/AdminBannerVideoTab.tsx` that:
- Shows 7 sections, each with:
  - Label (e.g. "Male Dashboard")
  - Current video preview (`<video>` tag with controls)
  - Text input for new video URL
  - "Save" button that calls `supabase.from('page_videos').upsert({page_key, video_url})`
- Fetches current URLs from `page_videos` table on mount
- Uses `adminUserId` from `sessionStorage.getItem('adminUser')` to authenticate writes via the existing admin-data pattern

#### Step 3 — Add Tab to `AdminDashboard.tsx`

Add a 10th tab "Videos" (after Settings) that renders `<AdminBannerVideoTab />`.

Update the `TabsList` grid from `md:grid-cols-8` to `md:grid-cols-9` and add:
```tsx
<TabsTrigger value="videos">Videos</TabsTrigger>
...
<TabsContent value="videos"><AdminBannerVideoTab /></TabsContent>
```

#### Step 4 — Create a shared hook `usePageVideo(pageKey)`

`src/hooks/usePageVideo.ts` — a simple hook that:
- Queries `supabase.from('page_videos').select('video_url').eq('page_key', pageKey).single()`
- Returns `{ videoUrl: string | null, loading: boolean }`
- Falls back to the hardcoded URL if null

#### Step 5 — Update each page to use dynamic video

**`UserDashboard.tsx`** — Replace hardcoded `heroVideoUrl` ternary with `usePageVideo` results:
- Male/normal users → `usePageVideo('dashboard_male')`
- Stripper/exotic users → `usePageVideo('dashboard_dimes')`
- If null → existing fallback URL

**`pages/Tip.tsx`** (the actual Tip & Win page):
- Replace `banner_photo` image section at top with a video element
- Load URL via `usePageVideo('tip_win_page')`
- Move the "💎 Tip & Win 💎 / Tip your favorite Dimes..." text from inside the banner to **below** the video
- If no admin video URL → show existing banner photo

**`pages/RateGirls.tsx`**:
- Replace hardcoded `src` in the video banner with `usePageVideo('rate_page')`
- Move "⭐ Rate 100 Ladies' Profiles ⭐" + subtext from video overlay to **below** the video as a standalone heading block
- If null → keep existing hardcoded URL as fallback

**`components/DimesDirectory.tsx`**:
- Add a video banner at the top using `usePageVideo('dimes_directory_page')`
- Move any existing header text below the video
- If null → no video shown

**`pages/EventsDimes.tsx`** (events page for males/normal females):
- Replace hardcoded S3 URL with `usePageVideo('events_male_page')`
- If null → existing hardcoded URL as fallback

**`pages/EventsDimesOnly.tsx`** (events for dimes/strippers/exotics):
- Replace hardcoded banner video URL with `usePageVideo('events_dimes_page')`
- If null → existing hardcoded URL as fallback

### Files to Create/Modify

```text
CREATE:
  src/components/AdminBannerVideoTab.tsx   (new admin tab UI)
  src/hooks/usePageVideo.ts               (shared hook)
  supabase/migrations/XXXX_page_videos.sql (DB table)

MODIFY:
  src/pages/AdminDashboard.tsx            (add Videos tab)
  src/components/UserDashboard.tsx        (dynamic hero video per user type)
  src/pages/Tip.tsx                       (add video banner, move text below)
  src/pages/RateGirls.tsx                 (dynamic video, move text below)
  src/components/DimesDirectory.tsx       (add video banner, move text below)
  src/pages/EventsDimes.tsx               (dynamic video banner)
  src/pages/EventsDimesOnly.tsx           (dynamic video banner)
```

### Notes
- All writes to `page_videos` go directly from `AdminBannerVideoTab` using `supabase` client with the admin user's session (same pattern as other admin writes)
- The RLS `SELECT` policy is open (public) so pages can load videos without auth
- Fallback to hardcoded URLs prevents broken pages during initial setup
- "SHOW VIDEO" in admin = the `<video>` preview already rendered in the admin tab UI
