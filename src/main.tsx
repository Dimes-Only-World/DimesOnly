import React from "react";
import { createRoot } from 'react-dom/client'
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import App from './App.tsx'
import './index.css'

// PayPal configuration - using hardcoded client ID since VITE_ env vars don't work in Lovable
const PAYPAL_CLIENT_ID = "AaLUVAQ6EJeqS3dSFGIGkH9qcQ-HXJX3IhPcLG3SLUkiHMdG_V-_WJXcK4eFvJgJqF5LSCHRdxwzMqRt";

const paypalOptions = {
  clientId: PAYPAL_CLIENT_ID,
  currency: "USD",
  intent: "capture" as const,
};

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PayPalScriptProvider options={paypalOptions}>
      <App />
    </PayPalScriptProvider>
  </React.StrictMode>
);
