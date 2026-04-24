## Fix Media page banner to show "Diamond Member" for Diamond users

The Media page banner currently shows "Free Member" with the subtitle "Upgrade to unlock more features and upload limits" for Diamond members. The badge fix already landed in `MediaUploadSection.tsx`, but the top banner in `UserMediaUploadTab.tsx` still falls through to the Free state because `getMembershipStatus()` doesn't recognize the plain `diamond` tier.

### Fix

**`src/components/UserMediaUploadTab.tsx` — `getMembershipStatus()`**

Add a `diamond` case between the Diamond Plus and Gold checks:

```ts
if (rawTier === 'diamond') {
  return { 
    tier: 'Diamond', 
    icon: <Crown className="w-5 h-5 text-purple-300" />, 
    color: 'from-purple-500 to-pink-500' 
  };
}
```

### Banner subtitle for Diamond

Update the subtitle conditional so Diamond members see:
**"Upgrade to Diamond Plus to unlock more features and upload limits"**

While Free members keep the existing exact text:
**"Upgrade to unlock more features and upload limit"** (unchanged per user instruction)

Other tiers (Silver, Gold, Silver Plus, Diamond Plus) keep the existing "premium features" message.

### Upgrade button

Show an "Upgrade Now" button for Diamond members too, routing to `/upgrade-diamond` (the Diamond Plus upgrade page). Free members keep their existing button to `/upgrade-silver-plus`.

### Files
- Edit: `src/components/UserMediaUploadTab.tsx` (add `diamond` case to `getMembershipStatus`, add Diamond-specific subtitle, show upgrade button for Diamond)
