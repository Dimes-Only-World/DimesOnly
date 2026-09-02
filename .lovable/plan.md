# Admin Leads: accurate counts + phone/DOB matching

## Problem

The four counters on the Leads tab overlap, so they don't add up. Today:

- Incomplete = every lead with no registration match
- Need More Info = every lead whose action was "more information"
- Complete = every lead whose action was "continued registration"

A lead who clicked "more information" and never registered is counted in both Incomplete and Need More Info, and a lead who clicked "continue" but never finished is counted as Complete even though no account exists. That is why 21 + 4 + 17 = 42 while there are only 28 leads.

## Fix: one status per lead

Every lead gets exactly one status, so the three numbers always sum to the total:

1. **Complete** — a registered account matches this lead (phone, or phone + date of birth).
2. **Need More Info** — not registered, and the lead chose "More information".
3. **Incomplete** — everything else (not registered, did not ask for more info).

Percentages are recalculated from the same buckets, and the filter buttons use the same rules, so clicking a counter shows exactly that many rows.

## Phone matching highlights

- If a lead's phone number already exists on a registered account, the phone cell gets a **green background** so it stands out at a glance.
- If the phone number **and** date of birth both match a registered account, the Registration column shows **Complete - username**.
- If only the phone matches (birth date differs or is missing), it still shows green on the phone and a "Complete" badge with the username, so nothing is lost.

Name-only matching is dropped from the "complete" determination — it produces false positives on common names. Matching is on phone (last 10 digits) with date of birth as the stronger confirmation.

## Technical notes

- `supabase/functions/admin-data/index.ts`, `fetchAgeGateLeads`: also select `date_of_birth` from `users`; build the phone index on the last 10 digits; return per lead `phone_match` (boolean), `dob_match` (boolean), `registration_completed` (phone match), `registered_username`, `registered_at`.
- `src/components/AdminLeadsTab.tsx`: derive a single `status` per lead (`complete` | `more_info` | `incomplete`) via one helper used by both the counters and the display filter; apply `bg-green-100` (dark-mode-safe token) to the phone cell when `phone_match`; render `Complete - {username}` when `phone_match && dob_match`.
