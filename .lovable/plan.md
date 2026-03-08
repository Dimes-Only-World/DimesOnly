

## Problem: Referral Parameter Lost on Navigation

**Yes, this is a real problem.** When a user visits `DimesOnly.World/?ref=thetruth` and clicks "START FREE" or "Sign Up" links, the `?ref=thetruth` parameter is dropped, so the registration form cannot credit `thetruth` as the referrer. This means referral commissions would be lost.

### Root Cause

Several components use static `<Link to="/register">` without forwarding the current `?ref=` query parameter. The components that already work correctly (like `RefAwareActionButtons`, `ActionButtons`, `HeroBanner`) read `?ref=` from the URL and append it. But the landing page components do not.

### Files to Fix

**1. `src/components/landing/src/components/ReadyToStart.tsx`**
- Replace static `<Link to="/register">` and `<Link to="/login">` with dynamic links that read `?ref=` from the current URL using `useSearchParams` and append it.

**2. `src/components/landing/src/components/LatestDimesCarousel.tsx`** (landing version)
- Same fix: forward `?ref=` param on the `/register` and `/login` links in the dialog.

**3. `src/Login.tsx`**
- The "Don't have an account?" link at the bottom uses `<Link to="/register">` without forwarding `?ref=`. Update it to preserve the ref param.

### Implementation Pattern

Each component will use `useSearchParams()` to read the current `ref` parameter and build the link dynamically:

```tsx
const [searchParams] = useSearchParams();
const ref = searchParams.get("ref");
const registerUrl = ref ? `/register?ref=${encodeURIComponent(ref)}` : "/register";
const loginUrl = ref ? `/login?ref=${encodeURIComponent(ref)}` : "/login";
```

Then use `<Link to={registerUrl}>` instead of `<Link to="/register">`.

