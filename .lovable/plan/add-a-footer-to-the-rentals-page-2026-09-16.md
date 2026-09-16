# Add a footer to the Rentals page

## Goal
Give /rentals a proper site footer that matches the Premium Editorial Showroom design already on the page, using the columns and links you listed previously (Product / Account / legal + copyright).

## Current state (verified)
- `src/pages/Rentals.tsx` has no footer — the page ends after the fleet grid and CapturesGallery.
- The site-wide `src/components/Footer.tsx` is a different visual style (black bar, Housing Angels branding) and does not match the rentals design, so it won't be reused as-is.
- The rentals page uses its own design tokens (`rental-*`: near-black background, red accent) and the `font-barlow` typeface.
- Routes that exist and will be linked: `/rentals`, `/login`; sign-up page used by the login page's Sign Up link.
- There is no standalone /terms or /privacy page, so the existing pattern (Privacy Policy modal in the site footer) will be reused.

## Changes
New component `src/components/rentals/RentalsFooter.tsx`, rendered at the bottom of `src/pages/Rentals.tsx`:

```text
| Product            | Account   | Company            |
|--------------------|-----------|--------------------|
| Book a car         | Log in    | Terms of Service   |
| List a car         | Sign up   | Cancellation policy|
| Become a Host      |           | Privacy Policy     |

© 2026 Dimes Only. All rights reserved.
```

- Product links: "Book a car" → /rentals; "List a car" and "Become a Host" → the existing online application form (the same Zoho form the main footer's "Apply Online" uses).
- Account links: "Log in" → /login (referral `?ref=` param preserved, same as other footer links); "Sign up" → the sign-up flow reached from /login.
- "Privacy Policy" opens the same modal pattern used by the main site footer (effective date, contact email/phone).
- Styled with the `rental-*` tokens and `font-barlow` so it blends with the showroom page: dark surface, thin top border, red accent on hover, small uppercase column headings.
- Fully responsive: columns stack on small screens (including Galaxy Fold widths) into a single centered column.
- Brand name shown as "Dimes Only" (Carsan was renamed per project standard).

## Verification
- Build passes.
- Playwright check: footer renders on /rentals, columns stack at 344px width, links navigate, privacy modal opens.
