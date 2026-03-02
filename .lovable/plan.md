

## Plan: Show Referrer's Actual Profile Photo on Landing Page

### Problem
When someone clicks "Click for Your Referral Link" in the Make Money tab, the landing page opens with `?ref=username`. The `ReferrerProfile` component in `src/components/landing/src/components/ReferrerProfile.tsx` always shows a hardcoded default avatar instead of fetching the referrer's actual profile photo from Supabase.

### Solution
Update `ReferrerProfile.tsx` to fetch the referrer's profile data from Supabase using the `public_user_profiles` view (which bypasses RLS) and display their actual `profile_photo` or `front_page_photo`.

### Changes

**1. `src/components/landing/src/components/ReferrerProfile.tsx`**
- Add Supabase client import (create inline client using env vars since the landing sub-project has no Supabase setup)
- Add `useState` and `useEffect` to fetch referrer data from `public_user_profiles` view by username
- Display the fetched profile photo instead of the static default avatar
- Fall back to default avatar if no photo is found or on error
- Show a loading state while fetching

### Technical Detail
The landing sub-project doesn't have a Supabase client configured. We'll create a lightweight inline Supabase client in the component using `@supabase/supabase-js` (already installed in the parent project) with the same env vars (`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`). The query will use `public_user_profiles` view which allows anonymous access to non-sensitive profile fields.

