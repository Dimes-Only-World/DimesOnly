# Make ?ref= work on Rentals and FlameFlix

## Short answer to your question

Right now, no — a `?ref=username` link pointing at `/rentals` or `/flix` does not reliably give that username credit, and the person is not reliably sent back to where they started.

What the code does today:

- Rentals: commission is calculated from the booking user's stored referrer in their profile, set at signup. The `ref` in the rentals URL is never read, so if someone lands on `/rentals?ref=jane`, signs up from there and books, Jane gets nothing unless her name was already on their profile.
- Rentals sign-up hand-off: the car page sends signed-out visitors to the register page with a return path, but it drops the `ref`, so the referrer is lost at the exact moment it would have been saved.
- FlameFlix: credit does work, but only if the referral code is still in the address bar (or already saved) when the visitor reaches the pricing page. The code is only picked up on that one page, so landing on `/flix?ref=jane` and browsing first loses it.
- FlameFlix sign-in hand-off: those pages send people to log in with a return value the login page does not read, so members land on the dashboard instead of coming back to FlameFlix.

## What will change

1. A referral name in the address bar is captured once, anywhere on the site, and remembered for the visit.
2. Every "sign up" or "log in" hand-off from rentals and FlameFlix carries both the referral name and the page to come back to.
3. After registering or signing in, the person returns to the rentals or FlameFlix page they came from, instead of the dashboard.
4. FlameFlix credit uses the remembered referral name, so it survives browsing before subscribing.
5. Rentals credit keeps using the referrer saved on the profile at signup — which now gets set correctly, because the referral name is no longer dropped on the way to registration.

## Technical notes

- Add a small site-wide referral capture (extend the existing `GARefTracker` or add a sibling component in `App.tsx`): on any route, read `?ref=`, normalize it with `normalizeRefParam`, and persist to `sessionStorage` under a single shared key. Have `getFlixRefCode()` in `src/lib/flix.ts` read that shared key as its fallback so FlameFlix and the rest of the site agree on one source.
- `src/pages/RentalDetails.tsx:183` — append `ref` to the `/register?redirect=...` URL when one is known.
- `src/components/rentals/RentalsFooter.tsx` already uses `withRef`; keep that pattern and reuse it for any other rentals CTA that links to register/login.
- FlameFlix gates in `FlixPricing.tsx:75`, `FlixTitle.tsx:46`, `FlixAccount.tsx:35`, `FlixEarn.tsx:114` use `?next=`, but `src/pages/Login.tsx:148` reads `?redirect=`. Standardize on `redirect` (or make Login accept both) so the return path works.
- `src/pages/Register.tsx:677` already honours `?redirect=`; no change needed beyond making sure the incoming links carry it.
- No database or commission-rate changes. FlameFlix payouts stay 10% direct / 5% upline via the existing `handle_flix_subscription_earnings` trigger on `flix_subscriptions.referral_code`; rentals stay on the server-derived chain in `rental-booking`, which never trusts client input.
