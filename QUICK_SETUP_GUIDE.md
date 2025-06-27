# Quick Setup Guide for Events System

## 🚀 Step-by-Step Setup

### 1. Database Setup

Run this SQL in your Supabase SQL Editor:

```sql
-- Run the fixed database setup
-- Copy and paste the entire content from database_setup_events_paypal.sql
```

### 2. Environment Variables

Create/update your `.env` file in the project root:

```bash
# Existing Supabase vars (keep these)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# PayPal Configuration (add these)
VITE_PAYPAL_CLIENT_ID=your_sandbox_client_id_here
VITE_PAYPAL_ENVIRONMENT=sandbox

# For Supabase Edge Functions (add to Supabase dashboard)
PAYPAL_CLIENT_ID=your_sandbox_client_id_here
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret_here
PAYPAL_ENVIRONMENT=sandbox
FRONTEND_URL=http://localhost:5173
```

### 3. Install PayPal SDK

```bash
npm install @paypal/react-paypal-js
```

### 4. Update main.tsx

Add PayPal provider to your `src/main.tsx`:

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
};

console.log("PayPal Client ID:", import.meta.env.VITE_PAYPAL_CLIENT_ID);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PayPalScriptProvider options={paypalOptions}>
      <App />
    </PayPalScriptProvider>
  </React.StrictMode>
);
```

### 5. Deploy Edge Functions

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Deploy the functions
supabase functions deploy create-paypal-order
supabase functions deploy paypal-webhook
```

### 6. Set Environment Variables in Supabase

Go to your Supabase Dashboard → Project Settings → Edge Functions:

- Add `PAYPAL_CLIENT_ID`
- Add `PAYPAL_CLIENT_SECRET`
- Add `PAYPAL_ENVIRONMENT`
- Add `FRONTEND_URL`

### 7. Configure PayPal Webhooks

In PayPal Developer Dashboard:

- Webhook URL: `https://your-project-id.supabase.co/functions/v1/paypal-webhook`
- Events: `PAYMENT.CAPTURE.COMPLETED`

## 🧪 Testing Without PayPal

For now, you can test the system without PayPal:

1. **Free Events**: Work immediately - users can join events with free spots
2. **Visual Indicators**: Green check/red X marks work
3. **Attendee Lists**: Search and filtering work
4. **Event Cards**: Show thumbnails and counts

## 🎯 What's Working Right Now

✅ **Visual attendance indicators** (green check/red X)  
✅ **Event cards with attendee thumbnails**  
✅ **Free event registration**  
✅ **Attendee search and filtering**  
✅ **Event statistics dashboard**  
✅ **Referral tracking from URL**  
✅ **Access control by user type**

## 🔧 PayPal Integration Status

The PayPal integration is **ready to go** but needs:

1. PayPal Developer Account setup
2. Sandbox credentials
3. Edge Functions deployed
4. Webhook configuration

## 📱 Test the System

1. **As a Stripper/Exotic user**:

   - Go to `/events-dimes-only?ref=testuser`
   - See events with visual indicators
   - Join free events (works immediately)
   - View attendee details

2. **As a Male/Female user**:
   - Go to `/eventsdimes?ref=testuser`
   - Should see events for selecting strippers/exotics

## ⚠️ Current Limitations

- **PayPal payments** need setup (but free events work)
- **Commission payouts** need PayPal setup
- **Webhook processing** needs deployment

## 🎉 Next Steps

1. **Test free events** - should work immediately
2. **Set up PayPal sandbox** when ready for paid events
3. **Deploy Edge Functions** for full PayPal integration
4. **Configure webhooks** for automatic processing

The core system is complete and functional! PayPal is just the payment layer on top.
