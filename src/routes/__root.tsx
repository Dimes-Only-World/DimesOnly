import "../lib/edgeAuthFetch";
import "@fontsource/bebas-neue/400.css";
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/500.css";
import "@fontsource/barlow/600.css";
import "@fontsource/barlow/700.css";
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import { Component, Suspense, useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "@/lib/router-compat";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import { AppProvider } from "@/contexts/AppContext";
import { StoreCartProvider } from "@/contexts/StoreCartContext";
import GARefTracker from "@/components/GARefTracker";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import GlobalVideoDownloadBlocker from "@/components/GlobalVideoDownloadBlocker";
import DashboardBackButtonGuard from "@/components/DashboardBackButtonGuard";
import AddToHomeScreenPrompt from "@/components/AddToHomeScreenPrompt";
import AngelLoader from "@/components/AngelLoader";
import { Toaster } from "@/components/ui/toaster";
import NotFoundPage from "@/pages/NotFound";
import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover",
      },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "theme-color", content: "#0f172a" },
      { title: "Dimes Only Network" },
      {
        name: "description",
        content:
          "A dynamic platform for fans to engage with their favorite performers, featuring tips, events, and exclusive content.",
      },
      { name: "author", content: "Famous.ai" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.dimesonly.world/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Famous_AI" },
      { property: "og:title", content: "Dimes Only Network" },
      { name: "twitter:title", content: "Dimes Only Network" },
      {
        property: "og:description",
        content:
          "A dynamic platform for fans to engage with their favorite performers, featuring tips, events, and exclusive content.",
      },
      {
        name: "twitter:description",
        content:
          "A dynamic platform for fans to engage with their favorite performers, featuring tips, events, and exclusive content.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap",
      },
      {
        rel: "icon",
        href: "/__l5e/assets-v1/47bc3f1c-dc54-4068-8794-b8c468cbd2b1/default-avatar.png?v=angel-2",
      },
      {
        rel: "shortcut icon",
        href: "/__l5e/assets-v1/47bc3f1c-dc54-4068-8794-b8c468cbd2b1/default-avatar.png?v=angel-2",
      },
      {
        rel: "apple-touch-icon",
        href: "/__l5e/assets-v1/47bc3f1c-dc54-4068-8794-b8c468cbd2b1/default-avatar.png?v=angel-2",
      },
      { rel: "preconnect", href: "https://qkcuykpndrolrewwnkwb.supabase.co", crossOrigin: "anonymous" },
      { rel: "dns-prefetch", href: "https://qkcuykpndrolrewwnkwb.supabase.co" },
      { rel: "stylesheet", href: appCss },
    ],
    scripts: [
      {
        src: "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js",
        defer: true,
      },
      {
        type: "text/javascript",
        children: "window.OneSignalDeferred = window.OneSignalDeferred || [];",
      },
      {
        type: "text/javascript",
        children:
          "window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}",
      },
      {
        type: "text/javascript",
        children: `(function(){var h=window.pageYOffset;window.onscroll=function(){var s=window.pageYOffset;document.body.style.transform=s<10?"translateY(0)":"translateY("+(10-s)+"px)";};})()`,
      },
      {
        type: "text/javascript",
        children: `(function(){function v(){var vh=window.innerHeight*0.01;document.documentElement.style.setProperty("--vh",vh+"px");}v();window.addEventListener("resize",v);})()`,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundPage,
  errorComponent: RootErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const location = useLocation();
  const normalizedPath = location.pathname.replace(/\/+$/, "");
  const showNotificationBell = normalizedPath === "/dashboard" || normalizedPath === "/dashboard/profile";

  return (
    <AppErrorBoundary>
      <AppProvider>
        <StoreCartProvider>
          <HelmetProvider>
            <PayPalRootProvider>
              <div className="App">
                <GARefTracker />
                <GlobalVideoDownloadBlocker />
                <DashboardBackButtonGuard />
                <CookieConsentBanner />
                {showNotificationBell && <AddToHomeScreenPrompt />}
                <Outlet />
                <Toaster />
              </div>
            </PayPalRootProvider>
          </HelmetProvider>
        </StoreCartProvider>
      </AppProvider>
    </AppErrorBoundary>
  );
}

/**
 * PayPal bootstrap carried over from the previous entry point: the client id
 * is fetched from the paypal-config Edge Function (with a 4s fallback), and
 * the PayPal provider only mounts once it is known.
 */
function PayPalRootProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<{ clientId: string; currency: string } | null>(null);

  useEffect(() => {
    let active = true;
    const fallback = setTimeout(() => {
      if (active) setOptions({ clientId: "test", currency: "USD" });
    }, 4000);
    supabase.functions
      .invoke("paypal-config")
      .then(({ data }) => {
        if (active && data?.clientId) setOptions({ clientId: data.clientId, currency: "USD" });
      })
      .catch(() => {});
    return () => {
      active = false;
      clearTimeout(fallback);
    };
  }, []);

  if (!options) return <AngelLoader />;
  return (
    <PayPalScriptProvider deferLoading={true} options={options}>
      {children}
    </PayPalScriptProvider>
  );
}

class AppErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  override state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("React app error:", error, info);
    if (typeof window !== "undefined") {
      (window as any).__REACT_APP_ERROR__ = {
        message: (error as Error | undefined)?.message || "Unknown error",
        stack: (error as Error | undefined)?.stack || "No stack trace",
        timestamp: new Date().toISOString(),
      };
    }
  }

  handleReset = () => this.setState({ hasError: false });

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center text-foreground">
          <h1 className="mb-4 text-2xl font-bold">Something went wrong</h1>
          <p className="mb-6 text-muted-foreground">
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={this.handleReset}
            className="rounded-md bg-primary px-6 py-3 font-semibold text-primary-foreground"
          >
            Try again
          </button>
          <a href="/" className="mt-4 text-sm text-primary underline">
            Return to home
          </a>
        </div>
      );
    }
    return this.props.children;
  }
}

function RootErrorComponent({ error, reset }: ErrorComponentProps) {
  const router = useRouter();

  useEffect(() => {
    const err = error as Error;
    console.error("Root route error:", err);
    reportLovableError({
      message: err?.message || String(err),
      stack: err?.stack,
      source: "root-error-boundary",
    });
  }, [error]);

  const tryAgain = () => {
    router.invalidate();
    reset();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center text-foreground">
      <h1 className="mb-4 text-2xl font-bold">Something went wrong</h1>
      <p className="mb-6 text-muted-foreground">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={tryAgain}
        className="rounded-md bg-primary px-6 py-3 font-semibold text-primary-foreground"
      >
        Try again
      </button>
      <a href="/" className="mt-4 text-sm text-primary underline">
        Return to home
      </a>
    </div>
  );
}
