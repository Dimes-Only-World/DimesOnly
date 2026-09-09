import React from "react";
import { useNavigate } from "react-router-dom";
import { Flame, X } from "lucide-react";

interface FlixPaywallProps {
  titleName?: string;
  onClose: () => void;
}

/** Tasteful paywall modal for locked titles. */
const FlixPaywall: React.FC<FlixPaywallProps> = ({ titleName, onClose }) => {
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Subscribe to watch">
      <div className="relative bg-[#141416] border border-[#2A2A2A] rounded-2xl max-w-md w-full p-8 text-center">
        <button onClick={onClose} className="absolute top-4 right-4 text-[#A1A1A1] hover:text-white" aria-label="Close">
          <X size={20} />
        </button>
        <Flame size={40} className="mx-auto text-[#FF4D1A] fill-[#FFB020]" />
        <h2 className="text-white text-2xl font-black mt-4">This one's for members</h2>
        <p className="text-[#A1A1A1] mt-2 text-sm">
          {titleName ? `"${titleName}" is streaming now on FlameFlix.` : "This title is streaming now on FlameFlix."} Join and watch it tonight.
        </p>
        <p className="text-[#FFB020] font-bold mt-4">$5.99/mo · or $29.99 your first year</p>
        <button
          onClick={() => navigate("/flix/pricing")}
          className="flix-ember-hover w-full mt-6 bg-[#FF4D1A] hover:bg-[#ff5d30] text-white font-bold py-3 rounded-md"
        >
          See Plans
        </button>
        <button onClick={onClose} className="w-full mt-3 text-[#A1A1A1] hover:text-white text-sm font-semibold py-2">
          Keep browsing
        </button>
      </div>
    </div>
  );
};

export default FlixPaywall;
