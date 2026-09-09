import React from "react";
import { Link } from "react-router-dom";
import FlixLogo from "./FlixLogo";

const FlixFooter: React.FC = () => (
  <footer className="border-t border-[#2A2A2A] bg-[#0B0B0D] mt-16">
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
      <div className="col-span-2 md:col-span-1">
        <FlixLogo size="sm" />
        <p className="text-[#A1A1A1] mt-3 text-xs leading-relaxed">
          Heat up the night. Stream what hits. FlameFlix is a Flame Flix, LLC service.
        </p>
      </div>
      <div>
        <p className="text-white font-bold mb-3">Watch</p>
        <ul className="space-y-2 text-[#A1A1A1]">
          <li><Link className="hover:text-white" to="/flix/browse">Browse</Link></li>
          <li><Link className="hover:text-white" to="/flix/search">Search</Link></li>
          <li><Link className="hover:text-white" to="/flix/pricing">Pricing</Link></li>
        </ul>
      </div>
      <div>
        <p className="text-white font-bold mb-3">Earn</p>
        <ul className="space-y-2 text-[#A1A1A1]">
          <li><Link className="hover:text-white" to="/flix/earn">Dimes Only Earnings</Link></li>
          <li><Link className="hover:text-white" to="/register">Join Dimes Only</Link></li>
        </ul>
      </div>
      <div>
        <p className="text-white font-bold mb-3">Support</p>
        <ul className="space-y-2 text-[#A1A1A1]">
          <li><Link className="hover:text-white" to="/flix/legal/terms">Terms</Link></li>
          <li><Link className="hover:text-white" to="/flix/legal/privacy">Privacy</Link></li>
          <li><a className="hover:text-white" href="mailto:support@dimesonly.world">Support</a></li>
        </ul>
      </div>
    </div>
    <div className="border-t border-[#2A2A2A] py-4 text-center text-[#A1A1A1] text-xs">
      © {new Date().getFullYear()} Flame Flix, LLC · A Dimes Only World company
    </div>
  </footer>
);

export default FlixFooter;
