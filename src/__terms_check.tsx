import React from "react";
import { createRoot } from "react-dom/client";
import "@/index.css";
import TermsAndConditionsDialog from "@/components/TermsAndConditionsDialog";

const mock: any = {
  id: "x", username: "gime", user_type: "exotic",
  diamond_plus_active: true, silver_plus_active: false,
};

createRoot(document.getElementById("root")!).render(
  <div style={{ padding: 24 }}>
    <TermsAndConditionsDialog userData={mock} />
  </div>
);
