import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { captureRefFromUrl } from "@/lib/refCapture";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const GARefTracker: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    // Remember the referral username on any page, so it survives browsing
    // and is still available when the visitor signs up or subscribes.
    captureRefFromUrl();

    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && typeof window.gtag === "function") {
      window.gtag("event", "referral_visit", {
        ref_username: ref,
        page_path: location.pathname,
      });
    }
  }, [location.pathname, location.search]);

  return null;
};

export default GARefTracker;
