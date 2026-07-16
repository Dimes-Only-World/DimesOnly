## Goal

On the Tip & Win, Rate, Dimes, and Events pages, replace the yellow "Home" button with a circular **profile-picture button** at the top of the page. Clicking it navigates the logged-in user back to their dashboard home (`/dashboard/profile`).

## Pages to update

- `src/pages/TipGirls.tsx` (Tip & Win)
- `src/pages/RateGirls.tsx` (Rate)
- `src/pages/Dimes.tsx` (Dimes)
- `src/pages/EventsDimes.tsx` and `src/pages/EventsDimesOnly.tsx` (Events)

## Change

1. Create a small shared component `src/components/HomeProfileButton.tsx`:
   - Reads the current user from `useAppContext()`.
   - Renders a round avatar (48–56px) using `profile_photo`, with a `User` icon fallback if none.
   - Ring/border in the site's pink/magenta accent, subtle hover.
   - `onClick` → `navigate("/dashboard/profile")`.
   - If no user is logged in, falls back to navigating to `/login`.

2. In each of the pages above:
   - Remove the existing `<Button ...>Home</Button>` block and its `Home` import if unused.
   - Render `<HomeProfileButton />` at the very top of the page content (left-aligned, above headings/carousels).

No changes to dashboard tabs, business logic, routing, or other pages.