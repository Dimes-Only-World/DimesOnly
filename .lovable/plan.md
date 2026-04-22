

## Add a "Referrals" tab containing "Your Referrals"

Add an 8th dashboard tab called **Referrals** with its own URL `/dashboard/referrals`, move the "Your Referrals" list (filters + grid + pagination + DM modal) out of the Make Money tab, and leave Make Money focused purely on share/promo.

### New tab + route
- URL: `/dashboard/referrals` (works automatically — `App.tsx` already routes `/dashboard/:tab`).
- Add to slug maps in `UserDashboard.tsx`:
  - `SLUG_TO_TAB`: `"referrals": "referrals"`
  - `TAB_TO_SLUG`: `"referrals": "referrals"`
- Add an 8th `<TabsTrigger value="referrals">` styled identically to the others (Users icon from lucide-react, label "REFERRALS").
- Add `<TabsContent value="referrals"><UserReferralsTab /></TabsContent>`.
- Tab grid stays responsive — bump `lg:grid-cols-7` to `lg:grid-cols-8`.

### New component: `src/components/UserReferralsTab.tsx`
Self-contained, lifted directly from `UserMakeMoneyTab.tsx`. Contains:
- `actualUsername` fetch (for the "Checking referrals for: …" line)
- `fetchReferrals` via `supabase.rpc("get_my_referrals")`
- `usernameFilter` / `cityFilter` / `stateFilter` state + `ReferralFilters`
- "Your Referrals (count)" header + Refresh button
- Paginated grid of `ReferralCard`s (100/page, Previous/Next)
- `DirectMessageModal` wiring (Message button on each card)
- Empty state: "NO REFERRALS YET?" + prompt to share link

### Trim `UserMakeMoneyTab.tsx`
Remove from the file:
- The "Your Referrals" header block (`#full-money-circle` div with the heading + Refresh button + filters)
- The referral list / loading / empty-state / pagination block
- `DirectMessageModal` and its open/recipient state
- Unused state: `referrals`, `filteredReferrals`, `loading`, `currentPage`, `usernameFilter`, `cityFilter`, `stateFilter`, `isMessageModalOpen`, `selectedRecipientUsername`, `actualUsername` and their effects/handlers (`fetchReferrals`, `filterReferrals`, `fetchActualUserData`, pagination memos)
- Unused imports: `ReferralCard`, `ReferralFilters`, `DirectMessageModal`
- Keep: page header, share message block, Download Promo button, Referral Link card with all share buttons (these are the "share/get followers" tools — unchanged).
- `shareLink` will read username straight from `user` context (or refetch) so the page still works without the referrals query.

### MoneyCircle "View All" target
- Change `DashboardMoneyCircle`'s `onViewAll` and `onGetLink` in `UserDashboard.tsx` from `/dashboard/make-money` → `/dashboard/referrals` (referrals list is the natural destination).

### Files
- New: `src/components/UserReferralsTab.tsx`
- Edit: `src/components/UserDashboard.tsx` (slug maps, 8th tab trigger + content, grid-cols-8, MoneyCircle nav targets)
- Edit: `src/components/UserMakeMoneyTab.tsx` (remove referrals list, filters, DM modal, related state/imports)

