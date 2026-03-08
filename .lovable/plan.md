

## Plan: Fix Referral Parameter Not Forwarding to Register

### Root Cause

The `ReadyToStart.tsx` component uses `useSearchParams()` from `react-router-dom`, which should work. However, there are two problems:

1. **`src/pages/Login.tsx` (line 269)**: The "Sign up" link is hardcoded to `/register/?ref=company` instead of dynamically forwarding the actual `?ref=` from the current URL. This means if someone arrives at `/login?ref=thetruth` and clicks "Sign up," the ref is lost and replaced with "company."

2. **`ReadyToStart.tsx` potential context issue**: The component is imported from the landing subdirectory and relies on `useSearchParams()`. Given the subdirectory has its own `react-router-dom` listed in its `package.json`, even with `resolve.dedupe`, there may be edge cases where the Router context isn't shared. The safer approach is to use `window.location.search` (the same pattern used by `RefAwareActionButtons`, `ActionButtons`, `HeroBanner`, `ImageCarousel`, and `LatestDimesCarousel` in the main app) to read the ref param directly from the browser URL.

### Changes

**1. `src/components/landing/src/components/ReadyToStart.tsx`**
- Replace `useSearchParams()` with `window.location.search` via `URLSearchParams` to read the `ref` param directly from the browser URL, matching the pattern used by other working components like `RefAwareActionButtons`.
- Replace `<Link>` with `<a>` or `window.location.href` to avoid any Router context issues.

**2. `src/components/landing/src/components/LatestDimesCarousel.tsx`**
- Same fix: replace `useSearchParams()` with `window.location.search` for consistency.

**3. `src/pages/Login.tsx`** (line 268-273)
- Replace the hardcoded `to="/register/?ref=company"` with dynamic ref forwarding using `useSearchParams()` (this file is in the main app, so `useSearchParams` works correctly here).

### Why This Pattern

The components `RefAwareActionButtons`, `ActionButtons`, `HeroBanner`, `ImageCarousel`, and `LatestDimesCarousel` (main app version) all use `window.location.search` + `URLSearchParams` successfully. The landing subdirectory components should follow the same pattern to avoid any React Router context sharing issues.

