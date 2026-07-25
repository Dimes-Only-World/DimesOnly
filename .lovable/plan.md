## Problem

Account `@tipperjones` was upgraded to Gold. The database confirms `membership_tier = 'gold'`, but the profile still shows the **Silver Plus Member** badge.

Root cause: two independent issues.

1. **UI priority bug** — `src/components/ProfileSidebar.tsx` `getMembershipBadge()` checks `silver_plus_active` before it checks the current `membership_tier`. Since Silver Plus is a lifetime flag, it hides every higher paid tier (gold/diamond/elite) that is purchased afterward.
2. **Stale `membership_type`** — the membership webhook updates `membership_tier` to the new tier but leaves `membership_type` set to `silver_plus` from the earlier Silver Plus purchase. Some other UI (and any downstream reports that read `membership_type`) will keep saying Silver Plus.

Confirmed via DB read for `tipperjones`: `membership_tier=gold`, `membership_type=silver_plus`, `silver_plus_active=true`.

## Fix

### 1. Badge priority (`src/components/ProfileSidebar.tsx`)
Reorder `getMembershipBadge()` so the current paid tier wins, and Silver Plus is shown as a secondary lifetime marker:

- Priority order: Elite Plus → Diamond Plus → Diamond → Gold → Elite → Silver Plus → Silver → fallback.
- When a user has `silver_plus_active = true` AND a higher `membership_tier` (`gold`/`diamond`/`elite`/`diamond_plus`/`business_owner_elite`), render the higher badge plus a small "Silver Plus (Lifetime)" chip next to it so the lifetime perk is still visible.
- Prefer `membership_tier` over `membership_type` when both exist (drop the `|| userData.membership_type` fallback for the switch, since `membership_type` is stale after subsequent upgrades).

### 2. Keep `membership_type` in sync (`supabase/functions/membership-webhook/index.ts`, `activateMembership`)
When activating any non-`silver_plus` tier, also set `userPayload.membership_type = tier` so the two columns don't drift. Silver Plus activation keeps its current behavior (sets both to `silver_plus`).

### 3. Backfill the affected user
Run a one-off SQL update for `tipperjones` so the current Gold upgrade renders correctly without waiting for a new webhook:
```sql
UPDATE public.users
SET membership_type = 'gold', updated_at = now()
WHERE username = 'tipperjones';
```
(Leaves `silver_plus_active = true` intact as a lifetime flag.)

## Out of scope

- Not clearing `silver_plus_active` on upgrade — Silver Plus is a lifetime membership and its perks should persist.
- No changes to pricing, PayPal plans, or the upgrade purchase flow itself.

## Verification

- Reload `/dashboard/profile` for `@tipperjones` and confirm the badge shows **Gold Member** with a small "Silver Plus (Lifetime)" chip beside it.
- DB: `membership_tier` and `membership_type` both equal `gold`; `silver_plus_active` still `true`.
- Repeat mentally for a Silver-Plus user upgrading to Diamond / Elite Plus — badge reflects the new tier.
