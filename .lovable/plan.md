

## Plan: Change "Deactivate" to Fully Delete User

Currently, "Deactivate" only sets `is_active = false` on the `users` table. The request is to fully delete the user account instead.

### Changes

**1. `supabase/functions/admin-data/index.ts`** — Add a new `deleteUser` action that:
- Deletes the user's row from the `users` table
- Deletes the user from Supabase Auth using `supabaseAdmin.auth.admin.deleteUser(userId)`
- Optionally cleans up related data (media, messages, etc.) — or relies on `ON DELETE CASCADE` foreign keys

**2. `src/components/AdminUsersListEnhanced.tsx`** — Update `handleDeactivateUser` to:
- Call action `deleteUser` instead of `deactivateUser`
- Update confirmation text to "Are you sure you want to permanently delete this user?"
- Rename button label from "Deactivate" to "Delete"

**3. `src/components/AdminUserDetailsEnhanced.tsx`** — Same updates:
- Call `deleteUser` action
- Update confirmation and button text

### Edge Function Delete Logic

```typescript
case 'deleteUser': {
  const { userId } = params;
  // Delete from users table first
  const { error: dbError } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('id', userId);
  if (dbError) throw dbError;
  // Delete from Supabase Auth
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (authError) console.error('Auth deletion failed:', authError);
  result = { success: true };
  break;
}
```

### Safety

- Confirmation dialog with clear "permanently delete" wording
- Admin verification already handled by the existing `check_admin_by_user_id` guard in the edge function

