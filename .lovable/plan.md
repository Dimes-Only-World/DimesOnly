

## Fix: Move `usePageVideo` hook before early returns in UserDashboard

### Root Cause
The `usePageVideo` hook (line 406) was placed **after** two early `return` statements (lines 381, 391). When the component first renders with `loading=true`, it returns early and `usePageVideo` never runs. On the next render when data loads, the hook executes — React sees a different hook count and crashes.

### Fix
Move the hook call to the top of the component, before any conditional returns. Since `userData` may be null at that point, default `isDimeUser` to `false`.

**`src/components/UserDashboard.tsx`** — near the top (after existing hooks, ~line 56):
```tsx
const isDimeUser = userData
  ? ["stripper", "exotic"].includes((userData.user_type || "").toLowerCase())
  : false;
const dashboardFallback = isDimeUser
  ? "https://dimesonlyworld.s3.us-east-2.amazonaws.com/Dimes+Dashboard.webm"
  : "https://dimesonlyworld.s3.us-east-2.amazonaws.com/home+page.mp4";
const { videoUrl: heroVideoUrl } = usePageVideo(
  isDimeUser ? "dashboard_dimes" : "dashboard_male",
  dashboardFallback
);
```

Remove the duplicate block on lines 401-409.

### Also check other pages
Quickly verify `RateGirls.tsx`, `Tip.tsx`, `EventsDimes.tsx`, `EventsDimesOnly.tsx`, and `DimesDirectory.tsx` don't have the same issue (hook after early return). Fix any that do.

### Summary
One file change, one root cause — the banner video hook placement. This will restore the dashboard login flow.

