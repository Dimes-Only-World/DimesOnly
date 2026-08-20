# Live ticket counts: deduct every taken spot (free included)

## What's wrong today

This event already has 1 free registration in the database, but every public page shows `0/600 attending` and `600 spots available`. Row-level security on the registrations table only lets a person read *their own* registration rows, so the page counts everyone else as zero. Free spots therefore never appear to reduce availability, and the free-bucket "remaining" numbers are wrong too.

## What we'll build

1. A safe, read-only counter in the database that returns per-event totals without exposing anyone's personal data:
   - total attendees (sum of ticket quantities, so a guest counts as 2)
   - counts per free bucket (dimes, normals, males, females, strippers, exotics, plus tiers)
2. Every public surface reads those counts instead of trying to read registration rows:
   - Event details page
   - Events listing pages (Events, Events Dimes Only)
   - Ticket selector's "spots available" line
3. Display format, consistent everywhere:
   - Badge: `1/600 Attending`
   - Ticket option: `599 spots available`
   - Free option: `Free Diamond Plus: 299 spots left`
4. Immediately after a successful free registration or paid return, re-fetch the counts so the numbers drop right away (no refresh needed), instead of only nudging local state.

## Technical notes

- Add a `security definer` function `public.event_attendance_counts(p_event_id uuid)` returning `total_attendees` plus a jsonb map of used free spots grouped by the registrant's user type / membership bucket, with `grant execute` to `anon` and `authenticated`. Aggregate-only output — no user ids or names.
- Replace the direct `user_events` selects in `fetchEventDetails` / `calculateUsedFreeSpots` (`src/pages/EventDetails.tsx`), `src/pages/Events.tsx`, and `src/pages/EventsDimesOnly.tsx` with the RPC.
- In `src/components/EventTicketSelector.tsx`, keep `remainingCapacity = max_attendees - current_attendees` but clamp at 0 and use it in the General Admission description text.
- `handleFreeRegister` in `EventDetails.tsx` calls `fetchEventDetails()` after insert so counts come from the server.
- Attendee list stays as-is (still RLS-limited); only aggregate numbers change.
