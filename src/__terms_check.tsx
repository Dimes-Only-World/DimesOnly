import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import TermsAndConditionsDialog from "./components/TermsAndConditionsDialog";
import { Tables } from "./types";

const fakeUser = {
  id: "00000000-0000-0000-0000-000000000000",
  email: "check@example.com",
  username: "check",
  first_name: "Check",
  last_name: "User",
  gender: "female",
  user_type: "exotic",
  membership_tier: "diamond",
  referred_by: null,
  diamond_plus_active: true,
} as unknown as Tables<"users">;

function App() {
  useEffect(() => {
    const t = setTimeout(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) =>
        /terms and conditions/i.test(b.textContent || "")
      );
      btn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }, 300);
    return () => clearTimeout(t);
  }, []);
  return <TermsAndConditionsDialog userData={fakeUser} />;
}

createRoot(document.getElementById("root")!).render(<App />);
