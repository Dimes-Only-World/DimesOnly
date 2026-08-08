# Age Gate → Signup Form → Explainer Video Flow

Turn the current "ENTER - I am 18 years old or older" button on the home page into a short 3-step intro flow.

## The flow

```text
Step 1: Age warning (current screen)
   [ENTER - I am 18 years old or older]  [MEMBERS LOGIN]
            |
            v
Step 2: Quick form (in the same pop-up)
   Name  |  Phone number  |  Date of birth (Year -> Month -> Day)
   [Submit]
            |
            v
Step 3: Explainer video plays
   Buttons appear once the video finishes (or is skipped after it ends)
   [Continue Registration] -> /register (ref preserved, fields prefilled)
   [For more information click here] -> closes the pop-up, stays on home page
```

## Details

- **Form fields**: full name, phone number, and date of birth using the existing Year → Month → Day dropdown component already used on the registration form. Under-18 dates are rejected with a clear message, so the age claim is actually enforced.
- **Validation**: name required (2–100 chars), phone required and format-checked, DOB required and must be 18+.
- **Video step**: plays automatically, no seek-ahead. The two option buttons stay disabled until the video ends, then become active. A visible note tells the user the options unlock after the video.
- **Continue Registration**: sends the visitor to `/register`, keeping any `?ref=` referral code, and prefills name, phone, and date of birth so they do not retype them.
- **More information**: dismisses the pop-up and leaves the visitor on the home page.
- **Session behaviour**: once the form is submitted and the video step is reached, the gate does not reappear for the rest of the browser session (same as today's age verification).

## Lead capture

Every submission is saved so you can see who started but did not finish signing up:

- New `age_gate_leads` table: name, phone, date of birth, referral code, chosen action (continued vs. more info), and timestamp.
- Anonymous visitors can insert only; reads are restricted to admins. Submissions are written through a small server function so the raw table stays locked down.
- The leads are visible in the admin dashboard as a new "Leads" tab with newest-first list, showing name, phone, DOB, referrer, action taken, and date.

## Admin-managed video

- New page-video key `age_gate_explainer` labelled "Home Age Gate — Explainer Video" added to the Banner Videos tab, so you can swap the video at any time without code changes.
- Until a video is set there, the pop-up falls back to the current opening intro clip.

## Technical notes

- `src/components/AgeVerification.tsx` becomes a 3-step component (`warning` → `form` → `video`), reusing `DateOfBirthSelect` and `usePageVideo("age_gate_explainer")`.
- `AgeVerificationWrapper.tsx` keeps its session-based gating; completion is stored in `sessionStorage`.
- Migration creates `public.age_gate_leads` with grants, RLS enabled, insert policy for the submit path and admin-only select via `is_admin()`.
- New edge function `submit-age-gate-lead` validates input server-side (zod) and inserts with the service role.
- `AdminBannerVideoTab.tsx` gets the new page key; `AdminDashboard.tsx` gets the Leads tab.
