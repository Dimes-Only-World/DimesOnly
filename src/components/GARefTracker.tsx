import { useEffect } from "react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const GARefTracker: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && typeof window.gtag === "function") {
      window.gtag("event", "page_view", {
        page_path: location.pathname + "?ref=" + ref,
      });
    }
  }, [location.pathname, location.search]);

  return null;
};

export default GARefTracker;
