

## Plan: Redirect new users to their appropriate events page after registration

### What changes
In `src/pages/Register.tsx` (line 542), replace the single `navigate("/dashboard")` with conditional navigation based on the user's type:

- **Normal male or normal female** → `/eventsdimes?ref={username}` (the normal events page showing performers)
- **Exotic or stripper** → `/events-dimes-only?ref={username}` (the exotic/stripper events page)

### Implementation

**File:** `src/pages/Register.tsx` (line 542)

Replace:
```ts
navigate("/dashboard");
```

With:
```ts
const userType = formData.userType || '';
const username = formData.username || 'company';
if (userType === 'stripper' || userType === 'exotic') {
  navigate(`/events-dimes-only?ref=${encodeURIComponent(username)}`);
} else {
  navigate(`/eventsdimes?ref=${encodeURIComponent(username)}`);
}
```

This uses `formData.userType` which is already available in scope at that point. Normal males won't have a userType set (since the userType selector only shows for females), so the `else` branch correctly catches both normal males and normal females.

### No other files affected
The dashboard remains accessible via the navigation bar — this only changes the initial redirect after first registration.

