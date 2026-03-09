

## Problem
After registration, the user gets redirected to `/eventsdimes` but sees "Access Restricted" because the AppContext hasn't loaded the user data yet. The registration only stores `authToken` and `currentUser` in storage, but the AppContext has already completed its initialization by the time navigation happens. Since `initialized` is `true`, it won't re-fetch. The `user` object stays `null`, so `canViewPage` evaluates to `false`.

## Fix (2 changes)

### 1. Store full userData in sessionStorage after registration
**File:** `src/pages/Register.tsx` (lines 534-535)

After successful sign-in, store the complete user data object in `sessionStorage` as `"userData"` so AppContext can pick it up immediately:

```ts
// After signInWithPassword succeeds, store user data for AppContext
const userData = {
  id: result.user.id,
  username: result.user.username,
  email: formData.email,
  firstName: formData.firstName,
  lastName: formData.lastName,
  userType: formData.userType || '',
  gender: formData.gender || '',
  mobileNumber: formData.mobileNumber || '',
  address: formData.address || '',
  city: formData.city || '',
  state: formData.state || '',
  zip: formData.zip || '',
};
sessionStorage.setItem("userData", JSON.stringify(userData));
sessionStorage.setItem("currentUser", result.user.username);
localStorage.setItem("authToken", signInData.session?.access_token || result.user.id);
```

### 2. Reset AppContext `initialized` flag on auth state change
**File:** `src/contexts/AppContext.tsx`

Add an `onAuthStateChange` listener that re-triggers user loading when a new `SIGNED_IN` event fires (which happens after registration sign-in). This ensures AppContext picks up the new session even if it already initialized as a guest.

This two-pronged approach ensures:
- Immediate data availability via sessionStorage (no flash of "Access Restricted")
- AppContext properly syncs with the new auth session

