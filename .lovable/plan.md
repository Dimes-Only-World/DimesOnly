

## Add "Full Team Details" button under Money Circle

Add a new button labeled **"Click Here for Full Details on Your Team"** that appears directly under the "Hide Full Money Circle" button (only when the Money Circle is expanded with referrals). Clicking it navigates the user to `/dashboard/referrals`.

### Implementation

**`src/components/DashboardMoneyCircle.tsx`**
- Import `useNavigate` from `react-router-dom`.
- Add a second `<Button>` directly below the existing expand/hide toggle button, inside the `hasMore` block.
- Style: full-width, distinct accent (e.g. `bg-purple-600 hover:bg-purple-700 text-white rounded-lg mt-2`) so it visually separates from the blue toggle.
- `onClick` → `navigate("/dashboard/referrals")`.

The button shows whenever there are referrals to display (alongside the expand/hide toggle), giving users a clear path to the full Referrals page.

### Files
- Edit: `src/components/DashboardMoneyCircle.tsx` (add navigate hook + new button under the hide/expand toggle)

