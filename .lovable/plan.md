

## Problem

After registration, the user is redirected to `/eventsdimes` but sees "Access Restricted" because `AppContext.user` is still `null`. Although we store `userData` in sessionStorage, the `EventsDimes` page checks `useAppContext().user` which hasn't been updated yet — the `onAuthStateChange` SIGNED_IN event fires asynchronously and may not have been processed by the time the page renders.

## Root Cause

`Register.tsx` does not use `useAppContext()`, so it never calls `setUser()` directly. It relies on the async `onAuthStateChange` listener to pick up the sessionStorage data, but that's a race condition.

## Fix (1 file)

**`src/pages/Register.tsx`** — Import `useAppContext` and call `setUser(userData)` directly after building the userData object, before navigating. This guarantees the global user state is set synchronously before the redirect.

```ts
// Add to imports
import { useAppContext } from "@/contexts/AppContext";

// In the component, destructure setUser
const { setUser } = useAppContext();

// After building userData object (line ~548), add:
setUser(userData);

// Then navigate as before
```

This single change ensures `user` is non-null when EventsDimes renders, so `canViewPage` evaluates to `true`.

