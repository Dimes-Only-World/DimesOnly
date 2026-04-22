

## Add "My Money Circle" section under the dashboard video

Place a new "My Money Circle" block directly under the promo video (the `<p>` paragraph showing `shareMessage`) in `src/components/UserMakeMoneyTab.tsx`, above the Download Promo Video button.

### Behavior

**If `referrals.length >= 1`:**
- Heading: `My Money Circle` (centered, bold)
- Snapchat-style row of the **last 3 referrals**:
  - Circular avatar (`w-16 h-16 rounded-full`) with thick purple ring (`ring-4 ring-purple-500 ring-offset-2`)
  - Uses `profile_photo`, falls back to first letter of username inside a colored circle
  - Username below avatar (`text-xs font-semibold mt-2 truncate max-w-[80px]`)
  - Centered horizontal flex row with gap
- Button: `To See Your Full Money Circle` / `Click Here` → smooth-scrolls to the existing referrals list section (anchor `#full-money-circle`)

**If `referrals.length === 0`:**
- Heading: `My Money Circle`
- Text: `No One Yet!`
- Button: `Get Your Referral Link` / `Click Here` → smooth-scrolls to the Referral Link card (anchor `#referral-link-section`)

### Implementation details

1. Reuse existing `referrals` state (already loaded via `get_my_referrals` RPC). No new fetch.
2. `lastThreeReferrals = referrals.slice(0, 3)` (sort by `created_at` desc first to be safe).
3. Add `id="referral-link-section"` to the existing Share Card and `id="full-money-circle"` to the existing Referrals section wrapper.
4. Buttons use `document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })`.
5. No new files, no new dependencies, no DB or backend changes.

### File to edit
- `src/components/UserMakeMoneyTab.tsx`

