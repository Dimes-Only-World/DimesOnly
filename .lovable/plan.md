

# Fix Banner Videos + Add Version History with Revert

## Problems Identified

1. **TipGirls.tsx** (`/tip-girls`): Doesn't use `usePageVideo` at all — fully hardcoded S3 URL
2. **RateGirls.tsx** (`/rate-girls`): Uses `usePageVideo` but passes a hardcoded S3 fallback AND has `||` fallback in the `<source>` tag
3. **EventsDimes.tsx** (`/eventsdimes`): Same — uses `usePageVideo` with hardcoded fallback in both the hook call and template
4. **usePageVideo hook**: Accepts a `fallbackUrl` param that defeats the purpose of admin management

## Plan

### Part 1: Database — New `page_video_history` table

Create a migration to add a history table that stores previous video URLs (max 5 per page_key):

```sql
CREATE TABLE public.page_video_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text NOT NULL,
  video_url text NOT NULL,
  replaced_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.page_video_history ENABLE ROW LEVEL SECURITY;

-- Public read for admin UI
CREATE POLICY "public_read_video_history" ON public.page_video_history
  FOR SELECT TO public USING (true);

-- Anon write for admin saves (matches page_videos pattern)
CREATE POLICY "anon_write_video_history" ON public.page_video_history
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "service_write_video_history" ON public.page_video_history
  FOR ALL TO service_role USING (true) WITH CHECK (true);
```

### Part 2: Fix Pages — Remove all hardcoded fallbacks

**`src/hooks/usePageVideo.ts`**
- Remove the `fallbackUrl` parameter entirely
- Return `null` when no URL exists in the database (no more hardcoded fallbacks)

**`src/pages/TipGirls.tsx`**
- Import and use `usePageVideo("tip_win_page")`
- Replace hardcoded `<source>` with dynamic URL
- Conditionally render video block only when URL exists

**`src/pages/RateGirls.tsx`**
- Remove the fallback URL from `usePageVideo("rate_page")` call
- Remove `|| "https://..."` fallback from the `<source>` tag

**`src/pages/EventsDimes.tsx`**
- Remove the fallback URL from `usePageVideo("events_male_page")` call
- Remove `|| "https://..."` fallback from the `<source>` tag

### Part 3: Admin Panel — History + Revert with Hover Preview

**`src/components/AdminBannerVideoTab.tsx`**

On save:
1. Before upserting the new URL, insert the **current** URL into `page_video_history`
2. Query history count for that `page_key` — if >= 6, delete the oldest entry
3. Save the new URL as before

Add a "Previous Videos" dropdown below each card:
- Collapsible section showing up to 5 previous URLs
- Each history item shows a truncated URL
- **On hover**: A small floating preview appears (positioned near the link, like YouTube thumbnails) — uses a `<video>` element with `preload="metadata"` that auto-plays muted on hover
- **On click**: Reverts the banner to that URL (saves it as current, moves old current to history)

```text
┌─────────────────────────────────────┐
│  Tip & Win Page                     │
│  [current video preview]            │
│  URL: [_______________] [Save]      │
│                                     │
│  ▼ Previous Videos (3)              │
│  ┌─────────────────────────────┐    │
│  │ https://s3...vid1.mp4  [↩]  │    │
│  │ https://s3...vid2.mp4  [↩]  │◄── hover shows floating video
│  │ https://s3...vid3.mp4  [↩]  │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

The hover preview is a small absolutely-positioned box (similar to YouTube) that appears on mouse enter and disappears on mouse leave. It contains a small `<video autoPlay muted loop>` element showing the video. Not a modal — just a floating tooltip-style preview.

### Files Changed
- **New migration**: `page_video_history` table
- `src/hooks/usePageVideo.ts` — remove fallback parameter
- `src/pages/TipGirls.tsx` — add `usePageVideo`, remove hardcoded URL
- `src/pages/RateGirls.tsx` — remove fallback URLs
- `src/pages/EventsDimes.tsx` — remove fallback URLs
- `src/components/AdminBannerVideoTab.tsx` — add history save, revert dropdown, hover preview

