

## Plan: Soft-Delete (Deactivate) Users with Reversible Action + Email Notification

### Overview

Instead of permanently deleting users, the admin will **deactivate** them by setting `is_active = false` on the `users` table. Deactivated users are blocked from logging in but their data is preserved. The admin can **reactivate** them at any time. A deactivation email is sent to the user.

### Database

The `users` table already has an `is_active` boolean column — no schema changes needed.

### Changes

**1. `supabase/functions/admin-data/index.ts`** — Add two new actions:
- `deactivateUser`: Sets `is_active = false` and `deactivated_at = now()` on the user. Sends a deactivation email via Mailtrap (secrets already configured: `MAILTRAP_API_TOKEN`, `MAILTRAP_SENDER_EMAIL`).
- `reactivateUser`: Sets `is_active = true` and clears `deactivated_at`.

Keep the existing `deleteUser` action as a separate "permanent delete" option.

**2. `supabase/functions/authenticate-user/index.ts`** — After password validation succeeds, check `user.is_active`. If `false`, return an error like "Your account has been deactivated. Please contact support to file an appeal." Block login.

**3. `src/components/AdminUsersListEnhanced.tsx`** — Update the UI:
- Show a **"Deactivated"** badge next to deactivated users
- Replace the single "Delete" button with two buttons: **"Deactivate"** (orange) and **"Delete"** (red)
- For deactivated users, show a **"Reactivate"** button instead of "Deactivate"
- Add `is_active` to the User interface

**4. `src/components/AdminUserDetailsEnhanced.tsx`** — Same UI updates in the detail modal:
- Show deactivation status
- Add Deactivate/Reactivate toggle button alongside the permanent Delete button

**5. Database migration** — Add a `deactivated_at` timestamp column to `users` table for tracking when deactivation happened. Also need to add `is_active` to the select query in `authenticate-user`.

### Deactivation Email

The edge function will send an email via Mailtrap (already configured) with content like:

> Subject: Your Account Has Been Deactivated
> 
> Your account [username] on Dimelot has been deactivated by an administrator.
> If you believe this was a mistake, please send an appeal to [support email].

### Login Blocking Flow

In `authenticate-user`, after successful password match, add:
```typescript
if (user.is_active === false) {
  return Response("Account deactivated. Contact support to appeal.");
}
```

### Admin UI Flow

- **Deactivate**: Confirmation dialog → sets `is_active = false` → sends email → user card shows "Deactivated" badge
- **Reactivate**: Confirmation dialog → sets `is_active = true` → user can log in again
- **Delete**: Existing permanent delete (kept as separate destructive action)

