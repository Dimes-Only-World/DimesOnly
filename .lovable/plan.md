## Problem
The "Business Owner" radio is selected but no explainer video appears. `RegistrationFormFields.tsx` reads the video URL via `usePageVideo("register_business_owner")`, which pulls from the `page_videos` DB table. No row exists for that key (only `register_male` etc. were seeded), so `businessOwnerVideoUrl` is empty and the `<BannerVideo>` block is skipped.

## Fix
Add a Supabase migration that inserts default `page_videos` rows for the two BO keys already wired in code:

- `register_business_owner` → placeholder URL (same sample used for `register_male` until admin uploads the real one)
- `dashboard_business_owner` → placeholder URL

Use `ON CONFLICT (page_key) DO NOTHING` so existing/edited rows aren't overwritten. Admin can swap the URL anytime via the existing Banner Video tab.

## Out of scope
- No frontend changes (component logic already handles BO correctly once a URL exists).
- No edge function or registration flow changes.
