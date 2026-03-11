

# Fix: Dashboard Crash When Banner Video URL is Removed

## Root Cause
In `UserDashboard.tsx` line 454, `heroVideoUrl` (which can be `null`) is passed to `DashboardVideoHeader` which types its props as `string` (non-nullable). `BannerVideo` then receives `null` as `src`, causing a render crash caught by the error boundary.

## Fix — Two files

### 1. `src/components/DashboardVideoHeader.tsx`
- Change prop types to accept `string | null`
- If `videoSrc` is falsy, return `null` (render nothing)

### 2. `src/components/UserDashboard.tsx`
- No changes strictly needed (the child component handles it), but optionally wrap the `DashboardVideoHeader` block in a conditional for clarity

