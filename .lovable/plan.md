

## Fix Media page banner to show "Diamond Member" for Diamond users

The banner at the top of `/dashboard/media` shows "Free Member" for a Diamond user because `getMembershipStatus()` in `UserMediaUploadTab.tsx` doesn't have a case for the plain `diamond` tier — it only checks `diamond_plus`, `silver_plus`, `gold`, and `silver`, then falls through to "Free".

### Fix

**`src/components/UserMediaUploadTab.tsx` — `getMembershipStatus()` (lines 23-39)**

Add a `diamond` case after the `silver_plus` check:

```ts
if (rawTier === 'diamond') {
  return { tier: 'Diamond', icon: <Crown className="w-5 h-5 text-purple-200" />, color: 'from-purple-500 to-pink-500' };
}
```

Order: Diamond Plus → Silver Plus → **Diamond (new)** → Gold → Silver → Free.

The existing banner subtitle logic already handles non-Free tiers correctly ("You have access to premium features and higher upload limits"), and the "Upgrade Now" button only shows for Free users — both stay unchanged. The Free-tier subtitle text "Upgrade to unlock more features and upload limits" is not modified.

### Files
- Edit: `src/components/UserMediaUploadTab.tsx` (add `diamond` case to `getMembershipStatus`)

