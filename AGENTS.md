# Project Architecture Rules

- Route all viewer-facing videos sourced from `page_videos` through `BannerVideo`; this keeps playback controls consistent while background videos explicitly use background mode.
- Keep Make Money message bodies referral-agnostic in storage and append the signed-in member's canonical referral URL when rendering; this prevents stale or mismatched referral credit.
- Store age-verification selfies in the private `age-verification-selfies` bucket and expose only short-lived signed URLs through authorized edge functions; selfies are sensitive identity evidence.
- Submit vehicle purchase applications through the `submit-vehicle-purchase` Edge Function and keep their table service-role-only; buyer applications contain private financial data.- Calculate vehicle sale commissions (53% direct, 5% second level) only in edge functions from the stored referral chain on `vehicle_purchase_applications`; members read them via `sale-commissions`, and payout amounts must never come from the browser.
- Contests computed server-side in `rewards` edge function from existing activity tables; `reward_contests` is service-role-only so standings can't be tampered with.
- Store optional reward-carousel image and video backgrounds in the existing public `promo-videos/rewards` folder and save only their URLs on contests; this keeps admin-managed campaign media centralized.
- Finalize rental extensions only after server-verified PayPal capture, then store each permissive-use statement privately and authorize short-lived downloads through the rental extension edge function; this prevents unpaid date changes and document exposure.
- Validate rental pickup windows, long-term minimums, rent-to-own terms, and booking prices again inside `rental-booking`; browser totals and dates are display inputs, not authoritative payment data.
- Generate manual rental payment receipts only when an authorized admin marks cash or Cash App funds received, store them privately, and authorize short-lived downloads for the renter or admin.
- Reconcile rental booking and extension payments through the admin-only rental function, using recorded paid amounts and server-calculated method totals; this keeps financial reporting authoritative.
- Rental PayPal calls currently use the main PAYPAL_* secrets; RENTAL_PAYPAL_* routing is paused until the Best Rental Cars PayPal account is approved.
