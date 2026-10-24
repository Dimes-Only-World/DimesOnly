import React from "react";
import { openJoinFlow } from "@/lib/joinFlow";

const JoinFreeButton: React.FC<{ className?: string; label?: string }> = ({ className = "", label = "JOIN FREE" }) => (
  <button
    type="button"
    onClick={() => openJoinFlow()}
    className={`inline-flex items-center justify-center rounded-full bg-orange-500 hover:bg-orange-600 text-white font-extrabold tracking-wider px-10 py-4 text-lg shadow-lg shadow-orange-500/40 transition-colors ${className}`}
  >
    {label}
  </button>
);

export default JoinFreeButton;
