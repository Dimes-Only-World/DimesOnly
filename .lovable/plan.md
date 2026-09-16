# Three Dimes Only World Notification Emails

Design and wire three professional, mobile-friendly HTML emails in black + gold luxury style, sent from **Talent@DimesOnly.World**, each matching one of the uploaded hero images (tip / rated / event).

## What you'll see

**Shared layout for all three emails**
- Header: "Dimes Only World" wordmark in gold on black
- Full-width hero image (the uploaded artwork for that email type)
- Gold serif headline and body copy on black
- For Tip and Event: the other person's profile photo displayed in a gold-ringed circle
- Large gold call-to-action button
- Footer: "Talent Team • Talent@DimesOnly.World • Sexy Starts Here"
- Built with table-based, inline-CSS HTML so it renders correctly in Gmail, Yahoo, Outlook, Apple Mail, and on phones — same standard as the existing password-reset email fixes

**Email 1 — TIP**
- Subject: "You received a tip"
- Body: Hi {{dime_name}} — you just received {{commission}} from {{username}}. "Go in and thank them today…"
- {{profile_photo}} of the tipper in a gold circle
- Button: "Thank {{username}}" → links to the message thread with that user
- Hero: tip image (black velvet, coins, champagne)

**Email 2 — RATED**
- Subject: "You've been rated!"
- Body: Hi {{dime_name}} — currently at {{rating}}. "Add people to your money circle…"
- Button: "Grow your money circle" → links to the money circle / referrals page
- Hero: rated image (gold 100, five stars)

**Email 3 — EVENT**
- Subject: "Someone wants to see you at an event!"
- Body: Hi {{dime_name}} — {{username}} is going to {{event_details}}. "Message {{username}} and let them know what time you are coming…"
- {{profile_photo}} of that user in a gold circle
- Button: "Message {{username}}" → links to the message thread
- Hero: event image (red carpet, velvet ropes)

## How they connect to the existing system

- A single new server-side email sender (edge function `send-dime-email`) holds all three templates, fills the placeholders **from the database itself** (never trusting values sent from the browser), and delivers through the existing Mailtrap account. Placeholders keep the exact names you listed.
- **Tip email** fires automatically after a tip payment is captured (added to the existing tip-processing flow) — it emails the Dime her commission amount, the tipper's username and photo.
- **Rated email** fires when a new rating is submitted for a Dime — the server re-reads her current rating from the database before sending.
- **Event email** fires when someone claims/buys a ticket to an event a Dime is attending, and emails that Dime the attendee's name, photo, and the event details.

## Sending address

The emails will be sent as `Talent Team <Talent@DimesOnly.World>`. Note: the Mailtrap sender domain (dimesonly.world) must be verified there for delivery — if it isn't already, I'll flag it and tell you exactly what to click in Mailtrap.

## Technical details

- New file: `supabase/functions/send-dime-email/index.ts` (+ shared template module under `supabase/functions/_shared/`)
- The three uploaded images become hosted assets referenced by absolute URL (`https://dimesonly.world/...`) so they load inside email clients
- Touch points: `process-tip` / tip capture flow, rating submit flow, event ticket flow — each just calls the new sender with a type + record ID; all data is re-fetched server-side
- From name/address and the three templates live in one place for easy future edits
- Verified with a real send test (to a test inbox) and a build check

## Verification

- `bun run build` passes
- Test-send each of the three templates and confirm rendering (subject, hero, gold circle photo, button, footer) in a received email
- Confirm the three triggers call the sender only after the underlying action succeeds
