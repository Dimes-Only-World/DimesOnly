# Event Ticketing Overhaul: Free Tiers, Pricing, and Plus Members

## Goal
Give admins one consistent way to define who gets in free, what everyone else pays, and how Plus members are treated — then make every event surface (Events, Events Dimes, Events Dimes Only, Event Details, tiles/banners) reflect it.

## 1. New admin fields (Events tab)

Free-spot groups, shown side by side:

```text
Free Dimes            Free Strippers    Free Exotics
Free Normals          Free Males        Free Females
Free Silver Plus      Free Diamond Plus Free Elite Plus
Free Plus (all Plus members)
```

Grey-out (mutual-exclusion) rules, applied live in the form:
- If Free Dimes > 0, Free Strippers and Free Exotics are disabled/greyed until Free Dimes returns to 0.
- If Free Normals > 0, Free Males and Free Females are disabled/greyed until Free Normals returns to 0.
- If Free Plus > 0, Free Silver Plus / Diamond Plus / Elite Plus are disabled/greyed until Free Plus returns to 0.

Pricing:
- Add General Admission price (currently missing) alongside Males Price and the (already present but unexposed in one form) Females Price.
- If General Admission > 0, Males Price and Females Price grey out until General is $0.
- Both event forms in the admin (Add New Event and Edit Event) get the same fields and rules.

Plus member tickets:
- New selector: Plus tickets are **Free** or **Discounted**.
- When Discounted, a percent field appears; the Plus price is computed from General Admission (falling back to Males Price when General is $0) and shown live in the admin as a preview.

## 2. Public pages behavior

- Free tier resolution per viewer, in priority order: Plus-specific free (Free Plus, or the tier-specific Free Silver/Diamond/Elite Plus) → Dimes/Normals grouped free → gender/type free (strippers, exotics, males, females).
- Labels follow whichever field the admin actually used: an event configured with Free Normals: 300 shows "Free Normals: 300" everywhere instead of "Free Males: 2"; Free Dimes replaces "Free Exotic"/"Free Stripper" the same way. Photo/tile overlays use the same resolved label.
- Ticket selector: General Admission price is used when set; otherwise gender price. Plus members see either FREE or the discounted price with the percent shown.
- Pages updated: `src/pages/Events.tsx`, `src/pages/EventsDimes.tsx`, `src/pages/EventsDimesOnly.tsx`, `src/pages/EventDetails.tsx`, `src/components/EventTicketSelector.tsx`, `src/components/EventCard.tsx`.

## 3. Badge placement

Move the free-spot badges and the Going / Not Going pill out of the banner image overlay to a row **directly below the banner, above the event title**, on every events page (including the Dimes pages, where Free Exotic / Free Stripper move down with them). Banner stays clean.

## 4. Free Plus registration flow

When a viewer qualifies through a Plus free allocation, the confirmation dialog changes:
- Title stays "Confirm Free Registration".
- No guest field, no "+1" — guests cannot be admitted on a Plus free spot.
- Single input: "Enter your full name to confirm", required, then Confirm.
- Non-Plus free registrations keep the existing guest-name behavior.

## Technical notes

Migration adds to `public.events`:
`free_spots_dimes`, `free_spots_normals`, `free_spots_silver_plus`, `free_spots_diamond_plus`, `free_spots_elite_plus`, `free_spots_plus` (int, default 0), `general_admission_price` (numeric, default 0), `plus_ticket_mode` (text, default `'free'`), `plus_discount_percent` (numeric, default 0). Existing columns (`free_spots_strippers/exotics/males/females`, `males_price`, `females_price`, `price`) are kept so current events keep working.

A shared helper (new `src/lib/eventTickets.ts`) centralizes: resolving the viewer's free bucket + display label, computing general/gender/Plus prices, and remaining-spot math — so all four pages and the selector stay in sync. Used-spot counting in `user_events` is extended to the new buckets.
