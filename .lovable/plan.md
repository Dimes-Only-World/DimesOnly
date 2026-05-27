## Goal
On the registration form, when "Business Owner" is selected, show the explanation video and treat the user the same as "Male" on completing registration.

## Current state
- The explainer video for Business Owner already renders (`RegistrationFormFields.tsx`, lines 452-457) using the `register_business_owner` page video slot, the same pattern Male uses (lines 446-450). No change needed there.
- On submit (`Register.tsx`, lines 561-569), Business Owner is currently redirected to `/dashboard`, while Male falls through to `/eventsdimes?ref={username}`.

## Change
In `src/pages/Register.tsx`, remove the special `business_owner` branch so Business Owner falls into the same `else` path as Male:

```text
- if (formData.gender === 'business_owner') {
-   navigate(`/dashboard`);
- } else if (userType === 'stripper' || userType === 'exotic') {
+ if (userType === 'stripper' || userType === 'exotic') {
    navigate(`/events-dimes-only?ref=${encodeURIComponent(username)}`);
  } else {
    navigate(`/eventsdimes?ref=${encodeURIComponent(username)}`);
  }
```

Everything else (edge function payload already sends `userType: 'business_owner'`, the BO Elite gating elsewhere, dashboard banner logic) stays untouched.

## Out of scope
- No DB changes
- No edge function changes
- No changes to Elite upgrade flow, profile page, or admin video manager