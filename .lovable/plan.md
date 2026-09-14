# Protect `/rate-girls`

## Implementation
- Wrap the `/rate-girls` route with the existing shared authentication guard.
- Keep the current page behavior and ordering unchanged.
- Signed-out visitors will be redirected to `/login`; users authenticated through either the native Supabase session or the existing custom local session can continue to the page.

## Verification
- Confirm `/rate-girls` redirects to `/login` while signed out.
- Confirm `/rate-girls` renders normally with both supported sign-in session types.
- Check the preview build for errors.

## Technical details
- Reuse `AuthGuard` in the central route configuration rather than adding another page-specific authentication implementation.
