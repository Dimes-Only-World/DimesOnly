import React, { Suspense, useEffect, useState } from "react";
import { createRoot } from 'react-dom/client'
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import App from './App.tsx'
import './index.css'
import { supabase } from './integrations/supabase/client'
import AngelLoader from './components/AngelLoader.tsx'
import '@fontsource/bebas-neue/400.css'
import '@fontsource/barlow/400.css'
import '@fontsource/barlow/500.css'
import '@fontsource/barlow/600.css'
import '@fontsource/barlow/700.css'

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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Never let a slow/blocked network keep the app on the loading screen.
    const timer = setTimeout(() => {
      if (!cancelled) setReady(true);
    }, 4000);
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('paypal-config');
        if (error) throw error;
        if (!cancelled) setClientId(data?.clientId || '');
      } catch (err) {
        console.error('Failed to load PayPal config:', err);
        if (!cancelled) setClientId('');
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  if (!ready) return <LoadingFallback />;

  // Always render the same tree shape so a late config response never remounts
  // the app; only the PayPal SDK options change.
  return (
    <PayPalScriptProvider
      options={{
        clientId: clientId || 'sb',
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
