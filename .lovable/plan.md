

## Plan: Link "Mens Clothing" on Homepage to Dashboard Clothes Page

### Problem
The "Mens Clothing" link in `LandingFooter.tsx` currently points to `href="#"` (does nothing). The dashboard's CLOTHES button navigates to `/clothes`, but no route exists for it.

### Changes

1. **Create `/clothes` route** — Add a route in `src/App.tsx` that points to the `ComingSoon` page (since there's no dedicated clothes page yet). This ensures both the homepage link and the dashboard button work.

2. **Update LandingFooter link** — In `src/components/landing/src/components/LandingFooter.tsx`, change the "Mens Clothing" `href` from `"#"` to `"/clothes"`.

### Files to Edit
- `src/App.tsx` — Add `<Route path="/clothes" element={<ComingSoon />} />`
- `src/components/landing/src/components/LandingFooter.tsx` — Change `href: "#"` to `href: "/clothes"` for "Mens Clothing"

