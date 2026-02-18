
# Fix: Attendee Gender Badge Showing "Female" for All Normal Users

## Problem
On line 2243 of `AdminEventsTab.tsx`, the attendee badge hardcodes "Female" for any user with `user_type === "normal"`:
```tsx
{attendee.users?.user_type === "normal" ? "Female" : (attendee.users?.user_type || "User")}
```
This means every normal user (including males like "Ola") shows as "Female" in the attendees list.

## Fix (1 file, 3 small changes)

**File:** `src/components/AdminEventsTab.tsx`

### Change 1: Add `gender` to the Attendee interface
Add `gender?: string;` to the `users` object inside the `Attendee` interface (around line 106).

### Change 2: Fetch `gender` from the database
Add `gender` to the Supabase select query in `fetchEventAttendees` (around line 294-302), inside the `users(...)` join.

### Change 3: Fix the badge display logic
Replace the hardcoded "Female" on line 2243 with actual gender-aware logic:
```tsx
{attendee.users?.user_type === "normal"
  ? (attendee.users?.gender === "male" ? "Male" : attendee.users?.gender === "female" ? "Female" : "Normal")
  : (attendee.users?.user_type || "User")}
```

This ensures the badge displays the user's actual gender for normal users, and the user type (exotic, stripper, etc.) for other user types.
