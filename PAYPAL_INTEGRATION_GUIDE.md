PAYPAL_CLIENT_ID

# Your PayPal sandbox client ID (get from PayPal Developer Dashboard)

PAYPAL_CLIENT_SECRET

# Your PayPal sandbox client secret (get from PayPal Developer Dashboard)

PAYPAL_ENVIRONMENT

# Set to: sandbox

FRONTEND_URL

PAYPAL_WEBHOOK_ID

# Your PayPal webhook ID (get from PayPal Developer Dashboard after creating webhook)

# Set to: http://localhost:5173

# (or your production URL when you deploy)

# MAIN

# PayPal Integration Guide for Events Ticketing System

## Overview

This guide outlines what you need to set up PayPal integration for the events ticketing system with automatic revenue sharing.

## Required PayPal Account Setup

### 1. PayPal Business Account

- Create a PayPal Business Account at https://www.paypal.com/business
- Complete business verification process
- Enable PayPal Payments Standard or PayPal Checkout

### 2. PayPal Developer Account

- Go to https://developer.paypal.com/
- Log in with your PayPal Business account
- Create a new application for your project

### 3. Required Credentials

You'll need to provide these credentials:

#### Sandbox (Testing)

```
PAYPAL_CLIENT_ID_SANDBOX=your_sandbox_client_id
PAYPAL_CLIENT_SECRET_SANDBOX=your_sandbox_client_secret
PAYPAL_WEBHOOK_ID_SANDBOX=your_sandbox_webhook_id
```

#### Production (Live)

```
PAYPAL_CLIENT_ID_PRODUCTION=your_production_client_id
PAYPAL_CLIENT_SECRET_PRODUCTION=your_production_client_secret
PAYPAL_WEBHOOK_ID_PRODUCTION=your_production_webhook_id
```

## Database Tables Needed

### 1. Payments Table

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  paypal_order_id VARCHAR(255),
  paypal_payment_id VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_type VARCHAR(50) NOT NULL, -- 'event_ticket', 'tip', etc.
  payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  referred_by VARCHAR(255), -- Username of referrer
  referrer_commission DECIMAL(10,2) DEFAULT 0,
  event_host_commission DECIMAL(10,2) DEFAULT 0,
  platform_fee DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Commission Payouts Table

```sql
CREATE TABLE commission_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  commission_type VARCHAR(50) NOT NULL, -- 'referrer', 'event_host'
  amount DECIMAL(10,2) NOT NULL,
  payout_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'failed'
  paypal_payout_batch_id VARCHAR(255),
  paypal_payout_item_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Update Events Table

```sql
ALTER TABLE events ADD COLUMN IF NOT EXISTS max_attendees INTEGER DEFAULT 100;
```

### 4. Update User Events Table

```sql
ALTER TABLE user_events ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'free';
ALTER TABLE user_events ADD COLUMN IF NOT EXISTS referred_by VARCHAR(255);
ALTER TABLE user_events ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id);
```

## PayPal SDK Integration

### 1. Install PayPal SDK

```bash
npm install @paypal/react-paypal-js
npm install @paypal/checkout-server-sdk
```

### 2. Environment Variables

Create a `.env` file in your project root:

```bash
# PayPal Configuration
VITE_PAYPAL_CLIENT_ID=your_sandbox_client_id_here
VITE_PAYPAL_ENVIRONMENT=sandbox

# For production, change to:
# VITE_PAYPAL_CLIENT_ID=your_production_client_id_here
# VITE_PAYPAL_ENVIRONMENT=production
```

### 3. PayPal Provider Setup

Update your `src/main.tsx` file:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import App from "./App.tsx";
import "./index.css";

const paypalOptions = {
  "client-id": import.meta.env.VITE_PAYPAL_CLIENT_ID || "",
  currency: "USD",
  intent: "capture",
  "enable-funding": "venmo,paylater",
  "disable-funding": "",
  "data-sdk-integration-source": "integrationbuilder_sc",
};

console.log("PayPal Client ID:", import.meta.env.VITE_PAYPAL_CLIENT_ID); // For debugging

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PayPalScriptProvider options={paypalOptions}>
      <App />
    </PayPalScriptProvider>
  </React.StrictMode>
);
```

## Backend Implementation Needed

### 1. PayPal Order Creation Endpoint

Create a Supabase Edge Function or API endpoint:

```typescript
// /functions/create-paypal-order/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { eventId, userId, amount, referrer } = await req.json();

  // Create PayPal order
  const order = await createPayPalOrder({
    amount: amount,
    currency: "USD",
    description: `Event Ticket - ${eventId}`,
  });

  // Save payment record to database
  await supabase.from("payments").insert({
    user_id: userId,
    event_id: eventId,
    paypal_order_id: order.id,
    amount: amount,
    payment_type: "event_ticket",
    referred_by: referrer,
    referrer_commission: referrer ? amount * 0.2 : 0,
    event_host_commission: amount * 0.1,
  });

  return new Response(JSON.stringify({ orderId: order.id }));
});
```

### 2. PayPal Webhook Handler

Create webhook endpoint to handle payment completion:

```typescript
// /functions/paypal-webhook/index.ts
serve(async (req) => {
  const webhook = await req.json();

  if (webhook.event_type === "PAYMENT.CAPTURE.COMPLETED") {
    const paymentId = webhook.resource.supplementary_data.related_ids.order_id;

    // Update payment status
    await supabase
      .from("payments")
      .update({
        payment_status: "completed",
        paypal_payment_id: webhook.resource.id,
      })
      .eq("paypal_order_id", paymentId);

    // Add user to event
    const { data: payment } = await supabase
      .from("payments")
      .select("*")
      .eq("paypal_order_id", paymentId)
      .single();

    if (payment) {
      await supabase.from("user_events").insert({
        user_id: payment.user_id,
        event_id: payment.event_id,
        payment_status: "paid",
        payment_id: payment.id,
        referred_by: payment.referred_by,
      });

      // Process commission payouts
      await processCommissions(payment);
    }
  }

  return new Response("OK");
});
```

### 3. Commission Processing

```typescript
async function processCommissions(payment) {
  const commissions = [];

  // Referrer commission (20%)
  if (payment.referred_by && payment.referrer_commission > 0) {
    const { data: referrer } = await supabase
      .from("users")
      .select("id, paypal_email")
      .eq("username", payment.referred_by)
      .single();

    if (referrer?.paypal_email) {
      commissions.push({
        user_id: referrer.id,
        payment_id: payment.id,
        commission_type: "referrer",
        amount: payment.referrer_commission,
      });
    }
  }

  // Event host commission (10%)
  if (payment.event_host_commission > 0) {
    const { data: event } = await supabase
      .from("events")
      .select("host_user_id")
      .eq("id", payment.event_id)
      .single();

    if (event?.host_user_id) {
      commissions.push({
        user_id: event.host_user_id,
        payment_id: payment.id,
        commission_type: "event_host",
        amount: payment.event_host_commission,
      });
    }
  }

  // Insert commission records
  if (commissions.length > 0) {
    await supabase.from("commission_payouts").insert(commissions);
  }
}
```

## Frontend PayPal Button Component

Replace the current PayPal button with:

```tsx
import { PayPalButtons } from "@paypal/react-paypal-js";

const PayPalEventButton = ({ event, referrer, onSuccess, onError }) => {
  return (
    <PayPalButtons
      style={{ layout: "horizontal" }}
      createOrder={async () => {
        const response = await fetch("/functions/v1/create-paypal-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: event.id,
            userId: user.id,
            amount: event.price,
            referrer: referrer,
          }),
        });
        const { orderId } = await response.json();
        return orderId;
      }}
      onApprove={async (data) => {
        // PayPal will handle capture via webhook
        onSuccess(data);
      }}
      onError={(err) => {
        console.error("PayPal error:", err);
        onError(err);
      }}
    />
  );
};
```

## Required User Profile Updates

Users need to provide PayPal email for commission payouts:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS paypal_email VARCHAR(255);
```

## Webhook Configuration

1. In PayPal Developer Dashboard, configure webhooks:
   - Webhook URL: `https://your-domain.com/functions/v1/paypal-webhook`
   - Events to subscribe to:
     - `PAYMENT.CAPTURE.COMPLETED`
     - `PAYMENT.CAPTURE.DENIED`
     - `PAYMENT.CAPTURE.REFUNDED`

## Testing

1. Use PayPal Sandbox accounts for testing
2. Test scenarios:
   - Free event registration
   - Paid event registration
   - Commission calculations
   - Webhook processing
   - Payout processing

## Security Considerations

1. Validate webhook signatures
2. Use HTTPS for all endpoints
3. Sanitize all user inputs
4. Implement rate limiting
5. Store sensitive data securely

## Next Steps

1. Set up PayPal Business and Developer accounts
2. Create the database tables
3. Implement the backend functions
4. Configure webhooks
5. Test in sandbox environment
6. Deploy to production

## Support

For PayPal integration issues:

- PayPal Developer Documentation: https://developer.paypal.com/docs/
- PayPal Developer Community: https://www.paypal-community.com/
