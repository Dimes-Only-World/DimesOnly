# Admin Panel Dynamic Pricing & PayPal Integration Guide

## 🎯 **Overview**

This guide explains how to implement dynamic event pricing and attendee limits through an admin panel, with seamless PayPal integration.

## 🔧 **How It Works**

### **1. Admin Panel Controls**

The admin can dynamically set:

- ✅ Event ticket price (`price` field in events table)
- ✅ Maximum attendees (`max_attendees` field)
- ✅ Free spots for strippers (`free_spots_strippers`)
- ✅ Free spots for exotics (`free_spots_exotics`)

### **2. Real-Time PayPal Integration**

When a user clicks "Purchase Ticket":

1. **Frontend** sends event_id to backend (not hardcoded price)
2. **Backend** fetches current price from database
3. **PayPal order** created with live pricing
4. **Payment processed** with exact admin-set amount

## 📊 **Database Schema**

```sql
-- Events table with admin-controlled fields
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,        -- ✅ Admin sets this
  max_attendees INTEGER NOT NULL,      -- ✅ Admin sets this
  free_spots_strippers INTEGER DEFAULT 5,  -- ✅ Admin sets this
  free_spots_exotics INTEGER DEFAULT 5,    -- ✅ Admin sets this
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  photo_url TEXT,
  description TEXT,
  video_urls TEXT[],
  additional_photos TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🔄 **Payment Flow**

### **Step 1: User Clicks "Purchase Ticket"**

```javascript
// Frontend sends event_id (not price)
const response = await fetch("/api/create-paypal-order", {
  method: "POST",
  body: JSON.stringify({
    event_id: selectedEvent.id,
    user_id: user.id,
    payment_id: payment.id,
    description: `Event Ticket: ${selectedEvent.name}`,
    return_url: `${window.location.origin}/events-dimes-only?payment=success`,
    cancel_url: `${window.location.origin}/events-dimes-only?payment=cancelled`,
  }),
});
```

### **Step 2: Backend Fetches Live Price**

```javascript
// Backend gets current admin-set price
const { data: event } = await supabase
  .from("events")
  .select("id, name, price, max_attendees")
  .eq("id", event_id)
  .single();

// PayPal order uses live price
const orderData = {
  intent: "CAPTURE",
  purchase_units: [
    {
      amount: {
        currency_code: "USD",
        value: event.price.toFixed(2), // ✅ Live admin-set price
      },
    },
  ],
};
```

### **Step 3: PayPal Processes Payment**

- PayPal receives exact current price
- Payment completed with admin-set amount
- Revenue split calculated on actual price paid

## 🛠 **Admin Panel Implementation**

### **Required Admin Features:**

1. **Event Management Dashboard**

   ```javascript
   // Admin can update event pricing
   const updateEventPricing = async (eventId, newPrice, maxAttendees) => {
     await supabase
       .from("events")
       .update({
         price: newPrice,
         max_attendees: maxAttendees,
         updated_at: new Date().toISOString(),
       })
       .eq("id", eventId);
   };
   ```

2. **Real-Time Price Updates**

   - Admin changes price → Database updated
   - Next PayPal order uses new price
   - No code deployment needed

3. **Attendee Limit Controls**
   - Admin sets max_attendees
   - System prevents overselling
   - Free spots configurable per event

## 💰 **Revenue Split Logic**

```javascript
// Calculated on actual paid amount (not free attendances)
const calculateRevenueSplit = (paidAmount, referrer) => {
  const referrerCommission = referrer ? paidAmount * 0.2 : 0; // 20% to referrer
  const eventHostCommission = paidAmount * 0.1; // 10% to event performer
  const platformRevenue = paidAmount - referrerCommission - eventHostCommission;

  return {
    referrerCommission,
    eventHostCommission,
    platformRevenue,
  };
};
```

## 🎛 **Admin Panel UI Components**

### **Event Pricing Form:**

```jsx
const EventPricingForm = ({ event }) => {
  const [price, setPrice] = useState(event.price);
  const [maxAttendees, setMaxAttendees] = useState(event.max_attendees);
  const [freeStrippers, setFreeStrippers] = useState(
    event.free_spots_strippers
  );
  const [freeExotics, setFreeExotics] = useState(event.free_spots_exotics);

  const handleSave = async () => {
    await supabase
      .from("events")
      .update({
        price: parseFloat(price),
        max_attendees: parseInt(maxAttendees),
        free_spots_strippers: parseInt(freeStrippers),
        free_spots_exotics: parseInt(freeExotics),
        updated_at: new Date().toISOString(),
      })
      .eq("id", event.id);
  };

  return (
    <form onSubmit={handleSave}>
      <input
        type="number"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="Ticket Price ($)"
      />
      <input
        type="number"
        value={maxAttendees}
        onChange={(e) => setMaxAttendees(e.target.value)}
        placeholder="Max Attendees"
      />
      <input
        type="number"
        value={freeStrippers}
        onChange={(e) => setFreeStrippers(e.target.value)}
        placeholder="Free Spots - Strippers"
      />
      <input
        type="number"
        value={freeExotics}
        onChange={(e) => setFreeExotics(e.target.value)}
        placeholder="Free Spots - Exotics"
      />
      <button type="submit">Save Changes</button>
    </form>
  );
};
```

## ✅ **Benefits of This Approach**

1. **Dynamic Pricing**: Admin can change prices instantly
2. **No Code Changes**: Price updates don't require deployment
3. **PayPal Compatibility**: Works seamlessly with PayPal's API
4. **Revenue Tracking**: Accurate commission calculations
5. **Sold Out Protection**: Prevents overselling events
6. **Free Spot Management**: Configurable free attendances

## 🚀 **Implementation Steps**

1. **Create Admin Dashboard** with event management
2. **Update PayPal API** to fetch live pricing (✅ Already done)
3. **Add Admin Controls** for pricing and limits
4. **Test Payment Flow** with dynamic prices
5. **Deploy Admin Panel** for client use

## 🔐 **Security Considerations**

- Admin panel requires authentication
- Price changes logged for audit trail
- PayPal validates amounts server-side
- No client-side price manipulation possible

---

**This system gives you complete control over event pricing while maintaining seamless PayPal integration!** 🎉
