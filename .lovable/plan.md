

## Fix "Free" badge showing on Media page for Diamond members

The Profile page correctly shows "Diamond Member", but the Media page shows "Free" for the same user. This is a logic gap in `MediaUploadSection.tsx`'s `getMembershipBadge()` function — it only recognizes `silver`, `gold`, `silver_plus`, and `diamond_plus`, but **not plain `diamond`** (the user's actual `membership_tier`). So Diamond members fall through to the default `Free` badge.

### Fix

**`src/components/MediaUploadSection.tsx` — `getMembershipBadge()` (lines 266-284)**

Add a case for `diamond` between the Diamond+ and Gold checks:

```ts
if (rawTier === 'diamond') {
  return <Badge className="bg-gradient-to-r from-purple-500 to-pink-500"><Crown className="w-3 h-3 mr-1" />Diamond</Badge>;
}
```

Order: Diamond+ → **Diamond (new)** → Silver+ → Gold → Silver → Free.

### Bonus: align upload limits with tier
While we're at line 86-100, Diamond members are likely expected to get the higher upload limits (260 photos / 48 videos) the same as Silver+/Diamond+. Currently `calculateUploadLimits` only bases limits on the selected `content_tier`, not the user's membership. The plan keeps current limit behavior unchanged unless you want me to expand it — confirm if you'd like the badge fix only, or also adjust limits for Diamond members.

### Files
- Edit: `src/components/MediaUploadSection.tsx` (add `diamond` case to `getMembershipBadge`)

