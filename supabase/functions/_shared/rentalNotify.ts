// Rental customer emails (booking confirmed, reminders, late, Notify Me, credit app status).
// Each email is recorded in rental_notifications_sent so it is sent at most once.
import { sendNoticeEmail } from "./dimes-emails.ts";

const SITE = "https://dimesonly.world";
const GRACE_MS = 2 * 3600_000;

const carName = (v: any) => [v?.year, v?.make, v?.model].filter(Boolean).join(" ") || "your rental";
const when = (iso: string) => new Date(iso).toLocaleString("en-US", { timeZone: "America/Los_Angeles", dateStyle: "medium", timeStyle: "short" }) + " PT";

async function claim(admin: any, refId: string, kind: string): Promise<boolean> {
  const { error } = await admin.from("rental_notifications_sent").insert({ ref_id: refId, kind });
  return !error; // unique violation → already sent
}

async function renter(admin: any, userId: string | null) {
  if (!userId) return null;
  const { data } = await admin.from("users").select("email, username, first_name").eq("id", userId).maybeSingle();
  return data?.email ? { email: data.email as string, name: (data.first_name || data.username || "") as string } : null;
}

async function send(admin: any, refId: string, kind: string, userId: string | null, title: string, message: string, buttonUrl: string, buttonLabel: string) {
  try {
    const to = await renter(admin, userId);
    if (!to) return;
    if (!(await claim(admin, refId, kind))) return;
    await sendNoticeEmail(to, { title, message, buttonUrl, buttonLabel, category: `rental_${kind}` });
  } catch (e) { console.error("rental notify failed", kind, e); }
}

export async function notifyBookingConfirmed(admin: any, bookingId: string) {
  const { data: b } = await admin.from("rental_bookings").select("id, renter_user_id, start_date, end_date, total_price, pickup_location, vehicles(year,make,model)").eq("id", bookingId).maybeSingle();
  if (!b) return;
  const code = String(b.id).slice(0, 8).toUpperCase();
  await send(admin, b.id, "booking_confirmed", b.renter_user_id, "Your booking is confirmed",
    `Booking ${code}: ${carName(b.vehicles)}\nPickup: ${when(b.start_date)}${b.end_date ? `\nReturn: ${when(b.end_date)}` : ""}${b.pickup_location ? `\nLocation: ${b.pickup_location}` : ""}\nTotal paid: $${Number(b.total_price || 0).toFixed(2)}`,
    `${SITE}/account/my-rentals`, "View My Rentals");
}

export async function notifyCarAvailable(admin: any, vehicleId: string) {
  const { data: v } = await admin.from("vehicles").select("id, year, make, model").eq("id", vehicleId).maybeSingle();
  const { data: holds } = await admin.from("rental_holds").select("id, user_id").eq("vehicle_id", vehicleId).eq("status", "held");
  for (const h of holds || []) {
    // One alert per hold per day the car frees up.
    await send(admin, h.id, `car_available_${new Date().toISOString().slice(0, 10)}`, h.user_id, `${carName(v)} is available`,
      `Good news — the car you asked to be notified about is available. Your Notify Me deposit will be credited when you book.`,
      `${SITE}/rentals/${vehicleId}`, "Book it now");
  }
}

const APP_STATUS_TEXT: Record<string, string> = {
  reviewing: "Your application is being reviewed.",
  contacted: "We've reached out about your application — please check your phone and email.",
  approved: "Congratulations — your application was approved! We'll be in touch with next steps.",
  declined: "We weren't able to approve your application at this time.",
  closed: "Your application has been closed.",
};

export async function notifyCreditAppStatus(admin: any, appId: string, status: string) {
  const text = APP_STATUS_TEXT[status];
  if (!text) return;
  const { data: a } = await admin.from("vehicle_purchase_applications").select("id, user_id, applicant").eq("id", appId).maybeSingle();
  if (!a) return;
  const email = a.applicant?.email;
  const to = email ? { email: String(email), name: String(a.applicant?.firstName || "") } : await renter(admin, a.user_id);
  if (!to) return;
  if (!(await claim(admin, a.id, `app_status_${status}`))) return;
  try { await sendNoticeEmail(to, { title: "Credit application update", message: text, buttonUrl: `${SITE}/account/my-purchases`, buttonLabel: "View My Purchases", category: "rental_app_status" }); }
  catch (e) { console.error("app status notify failed", e); }
}

/** Send due 24h/2h return reminders and late notices. Safe to call often; each email goes once. */
export async function runReturnReminders(admin: any) {
  const now = Date.now();
  const { data: rows } = await admin.from("rental_bookings")
    .select("id, renter_user_id, end_date, status, is_test, vehicles(year,make,model)")
    .in("status", ["paid", "active"]).not("end_date", "is", null)
    .lte("end_date", new Date(now + 24 * 3600_000).toISOString())
    .gte("end_date", new Date(now - 3 * 24 * 3600_000).toISOString());
  for (const b of rows || []) {
    if (b.is_test) continue;
    const end = new Date(b.end_date).getTime();
    const left = end - now;
    const car = carName(b.vehicles);
    if (now > end + GRACE_MS) {
      await send(admin, b.id, "late_notice", b.renter_user_id, "Your rental is late",
        `${car} was due back ${when(b.end_date)}. The 2-hour grace period has ended and late fees now apply. Please return the car or extend your rental right away.`,
        `${SITE}/account/my-rentals`, "Extend or view rental");
    } else if (left > 0 && left <= 2 * 3600_000) {
      await send(admin, b.id, "reminder_2h", b.renter_user_id, "Return due in 2 hours",
        `${car} is due back ${when(b.end_date)}. Need more time? You can extend from My Rentals.`, `${SITE}/account/my-rentals`, "View My Rentals");
    } else if (left > 2 * 3600_000) {
      await send(admin, b.id, "reminder_24h", b.renter_user_id, "Return due tomorrow",
        `${car} is due back ${when(b.end_date)}. Need more time? You can extend from My Rentals.`, `${SITE}/account/my-rentals`, "View My Rentals");
    }
  }
}
