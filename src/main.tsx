import React, { Suspense } from "react";
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
  // Defer loading to prevent blocking on mobile
  "data-sdk-integration-source": "integrationbuilder_sc",
};

// Error boundary for PayPal issues
class PayPalErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("PayPal provider error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Render app without PayPal if it fails
      return this.props.children;
    }
    return this.props.children;
  }
}

// Loading fallback
const LoadingFallback = () => (
  <div style={{ 
    minHeight: '100vh', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#000',
    color: '#fff'
  }}>
    Loading...
  </div>
);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PayPalErrorBoundary>
      <PayPalScriptProvider 
        options={paypalOptions}
        deferLoading={true}
      >
        <Suspense fallback={<LoadingFallback />}>
          <App />
        </Suspense>
      </PayPalScriptProvider>
    </PayPalErrorBoundary>
  </React.StrictMode>
);
