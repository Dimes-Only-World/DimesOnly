

## Scroll to referral link section when "Get Your Referral Link" is clicked

When a user with no referrals clicks **"Get Your Referral Link - Click Here"** in the Money Circle (on `/dashboard/profile`), navigate to `/dashboard/make-money` and auto-scroll to the **Your Referral Link** card (which already has `id="referral-link-section"`).

### Implementation

1. **`src/components/UserDashboard.tsx`**
   - Change `DashboardMoneyCircle`'s `onGetLink` callback from `navigate("/dashboard/referrals")` to `navigate("/dashboard/make-money#referral-link")`.
   - Keep `onViewAll` pointing at `/dashboard/referrals` (that's the referral list, unchanged).

2. **`src/components/UserMakeMoneyTab.tsx`**
   - Confirm the referral link `<Card>` keeps `id="referral-link-section"`.
   - Add a `useEffect` that runs on mount: if `window.location.hash === "#referral-link"`, call `document.getElementById("referral-link-section")?.scrollIntoView({ behavior: "smooth", block: "start" })` after a short delay (so layout settles).

3. **Tab switch reliability**
   - Because navigation also changes the active tab via `:tab` param, the Make Money TabsContent mounts fresh — the `useEffect` will fire correctly.
   - Use a `setTimeout(..., 100)` inside the effect to ensure the DOM has painted before scrolling.

### Files
- Edit: `src/components/UserDashboard.tsx` (update `onGetLink` target with hash)
- Edit: `src/components/UserMakeMoneyTab.tsx` (add hash-based auto-scroll on mount)

