import React from "react";
import { useLocation } from "react-router-dom";
import HomeProfileButton from "./HomeProfileButton";

// Routes where the floating profile button should NOT appear
const EXCLUDED_PREFIXES = [
  "/login",
  "/register",
  "/reset-password",
  "/adminlogin",
  "/admin",
  "/test-login",
  "/dashboard", // dashboard already has its own profile button in the header
  "/feed", // feed has its own home button
  "/upgrade",
  "/upgrade-silver",
  "/upgrade-silver-plus",
  "/upgrade-gold",
  "/upgrade-diamond",
  "/upgrade-diamond-monthly",
  "/elite",
  "/business-owner-elite",
];

const EXCLUDED_EXACT = ["/", "/failsafe"];

const GlobalProfileButton: React.FC = () => {
  const { pathname } = useLocation();

  if (EXCLUDED_EXACT.includes(pathname)) return null;
  if (EXCLUDED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return null;
  }

  return (
    <div className="fixed top-3 left-3 z-[60]">
      <HomeProfileButton />
    </div>
  );
};

export default GlobalProfileButton;
