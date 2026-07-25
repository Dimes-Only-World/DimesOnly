## Fix "Invalid Date" on Member Since card

**File:** `src/components/ProfileSidebar.tsx` (lines 347–352)

**Cause:** `userData.created_at` is empty/undefined or not a valid date string, so `new Date("").toLocaleDateString(...)` renders "Invalid Date".

**Fix:**
1. Guard the value before formatting — check that `created_at` exists and parses to a valid `Date` (`!isNaN(d.getTime())`).
2. If valid, render `Month YYYY` (e.g., "August 2025") using UTC to avoid timezone shifts.
3. If invalid/missing, render a graceful fallback like `—` (or hide the value line).

No schema, API, or business-logic changes. Purely a presentational guard in one component.