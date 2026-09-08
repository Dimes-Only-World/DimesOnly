# Dimes Only Clothing Store

A full clothing store inside the existing site at `/clothes`, paid for with the PayPal setup already in use, managed from new tabs in the current admin dashboard, and paying 10% clothing commission / 5% override into the earnings you already show.

## What you get

### The store (customer side)
- The CLOTHES buttons on the dashboard open the store instead of a video.
- Home page: full-bleed hero ("DIMES ONLY CLOTHING" + Shop the Drop), featured grid, limited-drop countdown, lookbook strip, footer with Shipping / Returns / Privacy / Terms / Contact and "Official apparel of Dimes Only World."
- Shop with filters (Women, Men, Unisex, Drops, Accessories, size, color, price) and sorting; collection pages for women, men, drops, accessories.
- Product page: image gallery, price and sale price, color swatches, size picker, stock status, size guide, related items.
- Cart drawer plus a cart page. Guests keep a cart in the browser; signed-in shoppers keep it saved to their account.
- Checkout: shipping address, shipping method (Standard $7.99, Express $14.99, free over $150), promo code, PayPal payment, confirmation screen. The order is only created after payment succeeds and stock is reduced safely.
- Account area: orders, addresses, wishlist. Live search. Wishlist hearts on cards.
- Dark luxury look: near-black background, gold hairlines, hot pink only for buttons and sale badges, serif headings.

### Twelve real starter products
Pink Diamond Crop Hoodie $89, Black Velvet Wifey Set $149, Gold Script Baby Tee $48, Hot Pink Bike Shorts $42, Rhinestone Mini Dress $165, Black Corset Tank $58, Black DIMES ONLY Heavy Hoodie $95, Gold Coin Graphic Tee $45, Night Club Track Pants $78, Diamond Club Snapback $38, Silk Durag "Dimes" $28, Limited Drop Socks 3-pack $22 — each with sizes, colors, stock per variant, descriptions and generated on-brand imagery.

### Admin (new tabs in your existing admin dashboard)
- Store overview: today's sales, order count, 7/30-day revenue, low-stock alerts, recent orders.
- Products: add, edit, archive, upload photos, set price, sale price, category, tags, featured, published; manage size/color variants.
- Inventory: adjust stock per variant with a reason; stock can never go below zero.
- Orders: filter by status, view details, add tracking number and carrier, mark refunded. Paid orders are never deleted.
- Customers: name, email, order count, total spent.
- Discounts: percent or dollar codes with minimum spend, dates and usage caps.
- Content: hero text, countdown date, announcement bar.
- Settings: store name, shipping rates, free-shipping threshold.
- Audit log: who changed what and when.

### Commissions
Every completed clothing order pays, on the item subtotal:
- 10% to the buyer's direct referrer
- 5% override to that referrer's upline

These appear as two new tiles on the dashboard ("Clothing Commissions" and "Overrides Clothing Commissions"), are added into total available earnings, and get their own rows in the Earnings tab — matching how tips and rentals already work.

## Technical outline

- Migration creating `store_products`, `store_variants`, `store_carts`/`store_cart_items`, `store_wishlists`, `store_addresses`, `store_orders`, `store_order_items`, `store_discounts`, `store_inventory_events`, `store_audit_logs`, `store_settings`, plus GRANTs and RLS: public read of published, non-archived products/variants; customers scoped to their own cart, wishlist, addresses and orders; admins full CRUD via `has_role(auth.uid(),'admin')`. Tables are prefixed to avoid colliding with the existing `payments`, `promo_codes` and `subscriptions` tables.
- `decrement_stock(variant_id, qty)` SECURITY DEFINER RPC that fails below zero.
- Storage bucket `product-images` (public read, admin write).
- Edge functions `store-checkout` (creates the PayPal order from server-priced items, validates promo code) and `store-capture` (captures payment, creates the order idempotently on the PayPal order id, decrements stock, clears cart, writes commission rows into `commission_payouts` with types `clothing_commission` / `clothing_upline`).
- Admin writes go through the existing admin edge-function pattern; the store admin lives as new tabs in `AdminDashboard.tsx`.
- `useDashboardStats.ts`, `DashboardCommandBar.tsx` and `UserEarningsTab.tsx` extended for the two new commission types.
- Routes added under `/clothes` in `App.tsx`; CLOTHES buttons in `DashboardBanner.tsx` and `DashboardCore.tsx` navigate there.

Build order: migration and seed data, then storefront, then cart/checkout, then admin tabs, then earnings. Nothing beyond this list.
