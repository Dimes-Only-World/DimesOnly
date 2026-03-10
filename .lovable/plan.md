
Root cause identified: the homepage route (`/`) renders `NewIndex`, which uses `src/components/LatestDimesCarousel.tsx` (main app), not the landing-subproject carousel file that was previously fixed.  
In this active carousel, Sign Up/Login still use the current URL’s `ref` (defaulting to `company`) instead of the clicked dime username, so registrations keep saving `referred_by = company/Company`.

Plan to fix:

1) Fix referral attribution in the active homepage carousel
- File: `src/components/LatestDimesCarousel.tsx`
- Update `navigateRegister()` to always set:
  - `/register?ref={selectedPerformer.username}`
- Update `navigateLogin()` to set:
  - `/login?ref={selectedPerformer.username}&redirect=/profile/{selectedPerformer.username}`
- Remove dependence on `getRefParam()` for these two CTA actions (clicked performer must be source of truth).

2) Align performer card data and media fallback logic
- In the same file, keep real DB-fetch logic and ensure image priority is:
  - `front_page_photo` first, then `profile_photo`, then fallback image.
- This keeps behavior consistent with expected referrer/profile visuals and avoids mismatches.

3) Harden “Company” display handling in profile sidebar
- File: `src/components/ReferrerInfo.tsx`
- Make company detection case-insensitive (`company`, `Company`, `THE COMPANY`, etc.) so users don’t see odd lowercase `@company` treatment as if it were a normal user.
- Normalize display label to a single canonical output (e.g., `@Company`).

4) Optional normalization safeguard at registration boundary
- File: `src/pages/Register.tsx`
- Before submit payload, normalize `formData.referredBy` once (trim/decode/case handling) so empty/invalid company aliases don’t produce inconsistent stored values.

5) Verification (end-to-end)
- From homepage `/`, click a performer in “Latest 20 Dimes,” click Sign Up, complete registration.
- Confirm new user row has `users.referred_by = clicked_performer_username` (not company).
- Log in as new user and verify sidebar “Referred By” shows the performer.
- Repeat once with Login path (`Login` CTA from same modal) and then register to ensure referral still follows clicked performer.
