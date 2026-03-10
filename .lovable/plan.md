

## Problem

When a user clicks on a dime in the "Latest Dimes to Join" carousel on the landing page and then clicks "Sign Up", the dime's username is **not** set as the `ref` parameter. Two bugs:

1. **Mock data**: The carousel uses hardcoded fake usernames (`dime_1`, `dime_2`, etc.) instead of real users from the database.
2. **No ref override**: When clicking "Sign Up" in the lightbox, the register URL only forwards the existing `?ref=` from the page URL. It never sets `ref` to the **clicked dime's username**. So the new account defaults to `referred_by = "Company"`.

## Plan

### 1. Fetch real dimes from Supabase
Replace the `mockDimes` array with a `useEffect` that queries `public_user_profiles` for the 20 most recently created female/exotic/stripper users, fetching `username`, `profile_photo`, and `front_page_photo`.

### 2. Set ref to the clicked dime's username
When a dime is selected and the user clicks "Sign Up", the register URL should be `/register?ref={selected_dime_username}` — overriding any existing `?ref=` param. Same for the Login link.

### 3. Display real photos
Use the dime's `front_page_photo` or `profile_photo` (with fallback to placeholder) in both the carousel card and the lightbox.

### Files to change
- **`src/components/landing/src/components/LatestDimesCarousel.tsx`** — replace mock data with Supabase query, update URLs to use selected dime's username as ref, display real photos.

