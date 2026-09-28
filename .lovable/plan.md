# Vehicle sale commissions

## What will change

### Admin: new "Sale Commissions" tab (Rentals admin)
- Lists every credit application. Each row shows the date received, buyer's first and last name with photo (initials if the buyer has no account), the application's area code, the referrer and the referrer's referrer (both with photos), the amount received from the broker, the 53% and 5% commissions, the date sold, and a colored status.
- Status colors: **Pending** yellow, **Declined** red, **Sold** green.
- **Mark as Sold**: admin enters the amount received from the broker and the sale date. The system then works out:
  - Direct referrer: 53% of the amount
  - Referrer's referrer: 5% of the amount
- **Change referrer**: admin can pick a different referrer by username. The second-level referrer then updates to match automatically.
- If the company referred the buyer, only "Company" shows and no commission is paid out.
- **Net profit summary**: total received from brokers, minus commissions paid, minus monthly bonuses, equals net profit. Shown for all sales and for the selected month.
- **Monthly top earners bonus**: shows a ranking of the month's highest sale-commission earners. Admin can enter a bonus amount for any of them and save it.

### Member earnings: "Vehicle Sale Commissions" section
- Every referrer sees the sales from people they referred, and from people those people referred.
- For privacy, members see only the **area code** and the **date the application was submitted**. They never see the buyer's name or photo.
- Each row shows their commission (53% or 5%) and the status: Pending yellow, Declined red, Sold green. Pending rows show an estimated amount or "Awaiting sale".
- Commissions from sold vehicles and any bonuses are added to the member's combined earnings total.

## Technical details
- New table `vehicle_sale_commissions`: application id, referrer and upline user ids, broker amount, the 53% and 5% amounts, status, sold date, and override info. Only the server can write to it. Members can read only their own rows, through a secure function that returns just the area code and date.
- New table `sale_commission_bonuses`: user, month, amount, note.
- Commission amounts are always calculated on the server from the database referral chain, never from what the browser sends. Changing the referrer recalculates the upline.
- New admin actions in `rental-admin`: list, mark sold, decline, change referrer, save bonus, and summary. Access uses the existing admin check.
- `earnings-query` / combined earnings will include sold vehicle commissions and bonuses.
- Credit app status "declined" syncs to Declined in the new tab.

## Assumptions (tell me if any are wrong)
- The 53% and 5% are paid from the gross amount received from the broker.
- The member earnings rows use the area code taken from the applicant's cell phone.
- Buyer photo comes from their account if they were signed in when applying. Otherwise initials show.
