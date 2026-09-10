import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, Search, X } from "lucide-react";
import FlixLogo from "./FlixLogo";
import { useAppContext } from "@/contexts/AppContext";

const NAV_LINKS = [
  { to: "/flix/browse", label: "Browse" },
  { to: "/flix/browse?sort=new", label: "New" },
  { to: "/flix/search", label: "Search" },
  { to: "/flix/pricing", label: "Pricing" },
  { to: "/flix/earn", label: "Earn" },
];

const FlixNav: React.FC = () => {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#0B0B0D]/95 backdrop-blur border-b border-[#2A2A2A]">
      <div className="max-w-[1400px] mx-auto flex items-center gap-6 px-4 md:px-8 h-16">
        <Link to="/flix" className="shrink-0" aria-label="FlameFlix home">
          <FlixLogo size="sm" />
        </Link>
        <nav className="hidden md:flex items-center gap-5 text-sm font-semibold text-[#A1A1A1]">
          {NAV_LINKS.map((l) => (
            <Link key={l.label} to={l.to} className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D1A] rounded">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => navigate("/flix/search")}
            className="md:hidden text-[#A1A1A1] hover:text-white p-2"
            aria-label="Search"
          >
            <Search size={20} />
          </button>
          {user ? (
            <>
              <Link to="/flix/account" className="text-sm font-semibold text-[#A1A1A1] hover:text-white transition-colors hidden sm:block">
                {user.username}
              </Link>
              <Link
                to="/flix/browse"
                className="flix-ember-hover bg-[#FF4D1A] hover:bg-[#ff5d30] text-white text-sm font-bold px-4 py-2 rounded-md"
              >
                Watch Now
              </Link>
            </>
          ) : (
            <>
              <Link to="/login?next=/flix/browse" className="text-sm font-semibold text-[#A1A1A1] hover:text-white transition-colors">
                Sign In
              </Link>
              <Link
                to="/flix/pricing"
                className="flix-ember-hover bg-[#FF4D1A] hover:bg-[#ff5d30] text-white text-sm font-bold px-4 py-2 rounded-md"
              >
                <span className="sm:hidden">Join</span>
                <span className="hidden sm:inline">Join FlameFlix</span>
              </Link>
            </>
          )}
          <button className="md:hidden text-white p-2" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="md:hidden border-t border-[#2A2A2A] bg-[#0B0B0D] px-4 py-3 flex flex-col gap-1">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              onClick={() => setOpen(false)}
              className="py-3 text-base font-semibold text-[#A1A1A1] hover:text-white"
            >
              {l.label}
            </Link>
          ))}
          {user && (
            <Link to="/flix/account" onClick={() => setOpen(false)} className="py-3 text-base font-semibold text-[#A1A1A1] hover:text-white">
              Account
            </Link>
          )}
        </nav>
      )}
    </header>
  );
};

export default FlixNav;
