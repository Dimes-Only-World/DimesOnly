import React, { Suspense, useEffect, useState } from "react";
import { createRoot } from 'react-dom/client'
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import App from './App.tsx'
import './index.css'
import { supabase } from './integrations/supabase/client'
import AngelLoader from './components/AngelLoader.tsx'

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
    return this.props.children;
  }
}

const LoadingFallback = () => <AngelLoader variant="fullscreen" />;

// Load PayPal client ID from the paypal-config edge function so the frontend
// SDK always matches PAYPAL_ENVIRONMENT (sandbox/live) on the backend.
const AppWithPayPal: React.FC = () => {
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('paypal-config');
        if (error) throw error;
        if (!cancelled) setClientId(data?.clientId || '');
      } catch (err) {
        console.error('Failed to load PayPal config:', err);
        if (!cancelled) setClientId('');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (clientId === null) return <LoadingFallback />;

  if (!clientId) {
    // PayPal not configured — render app anyway; PayPal buttons will be disabled.
    return <App />;
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency: "USD",
        intent: "capture" as const,
        "data-sdk-integration-source": "integrationbuilder_sc",
      }}
      deferLoading={true}
    >
      <App />
    </PayPalScriptProvider>
  );
};

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PayPalErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <AppWithPayPal />
      </Suspense>
    </PayPalErrorBoundary>
  </React.StrictMode>
);
