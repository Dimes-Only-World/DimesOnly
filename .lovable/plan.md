

# Diamond Plus Auto Pop-up on Dashboard

## What changes
When an approved performer (stripper/exotic with `approval_status === 'approved'`) loads their dashboard and hasn't yet upgraded to Diamond Plus, a **Dialog pop-up** will automatically appear showing the Diamond Plus offer. They can dismiss it or click to upgrade.

## Implementation

### 1. New component: `DiamondPlusPopup.tsx`
- A Dialog component that auto-opens when:
  - `userData.user_type` is "stripper" or "exotic"
  - `userData.approval_status === 'approved'`
  - `userData.diamond_plus_active` is falsy
- Shows the same Diamond Plus card content (price, spots left, upgrade button)
- Uses `sessionStorage` to avoid re-showing after dismissal within the same session
- "Upgrade Now" button navigates to `/upgrade-diamond`
- Dialog can be closed/dismissed

### 2. Edit: `src/components/UserDashboard.tsx`
- Import and render `DiamondPlusPopup` alongside the existing `DiamondPlusButton`
- Pass `userData` as prop

### Files
1. **New**: `src/components/DiamondPlusPopup.tsx`
2. **Edit**: `src/components/UserDashboard.tsx` — add the pop-up component

