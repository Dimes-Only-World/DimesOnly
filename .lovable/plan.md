

# Fix: "Joined Today" Bug on Tip & Win Page

## Problem
Every dime on the Tip page shows "Joined today" because the code hardcodes the join date to the current time (`new Date().toISOString()`) with a comment saying "Not available in public view." However, the `public_user_profiles` view **does** include `created_at`.

## Root Cause
In `src/pages/Tip.tsx` at line 422, the select query fetches: `"id, username, profile_photo, city, state, bio, user_type"` but does **not** include `created_at`. Then at line 445, it sets `created_at: new Date().toISOString()` as a fallback, making every profile appear as "Joined today."

## Fix (1 file, 2 lines)

**File:** `src/pages/Tip.tsx`

1. **Line 422** - Add `created_at` to the select query:
   - Before: `.select("id, username, profile_photo, city, state, bio, user_type")`
   - After: `.select("id, username, profile_photo, city, state, bio, user_type, created_at")`

2. **Line 445** - Use the actual value from the database:
   - Before: `created_at: new Date().toISOString(), // Not available in public view`
   - After: `created_at: data.created_at ? String(data.created_at) : new Date().toISOString(),`

This will display each dime's real join date instead of today's date.

