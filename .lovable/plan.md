

## Problem
In `UserMakeMoneyTab.tsx`, the `ReferralCard` component receives `onMessage={() => {}}` — an empty no-op function. Clicking "Send Message!" does nothing.

## Fix
Wire up `DirectMessageModal` in `UserMakeMoneyTab.tsx`, following the same pattern used in `DimesDirectory.tsx`:

**File: `src/components/UserMakeMoneyTab.tsx`**

1. Import `DirectMessageModal`
2. Add state for `isMessageModalOpen` and `selectedRecipientUsername`
3. Replace `onMessage={() => {}}` with a handler that sets the recipient username and opens the modal
4. Render `<DirectMessageModal>` at the bottom of the component

The `onMessage` callback receives `userId`, but `DirectMessageModal` expects a `recipientUsername`. So the handler will look up the username from the referral by id, then open the modal.

Since `referrals` array already contains `username`, the handler simply finds the referral by id and passes its username to the modal.

