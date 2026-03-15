

# Fix: Admin Direct Message Tab Shows No Users

## Root Cause

`AdminDirectMessageTab.tsx` queries `supabase.from("users").select(...)` directly. Since the admin uses custom authentication (sessionStorage, not a Supabase auth session), `auth.uid()` is null and RLS blocks the query, returning 0 rows.

## Fix

Replace the direct Supabase query in `fetchUsers()` with a call to the `admin-data` edge function using the existing `fetchAllUsers` action. This already exists and returns all users via `service_role`.

### Changes in `src/components/AdminDirectMessageTab.tsx`

**`fetchUsers` function** — replace the direct query:
```ts
// Before (blocked by RLS)
const { data, error } = await supabase.from("users").select("id, username, user_type, profile_photo").order("username");

// After (uses service_role via edge function)
const adminUserId = getAdminUserId();
const { data, error } = await supabase.functions.invoke("admin-data", {
  body: { action: "fetchAllUsers", adminUserId }
});
// Then extract users from data.data and map to the User interface
```

Single file change, no database or edge function modifications needed.

