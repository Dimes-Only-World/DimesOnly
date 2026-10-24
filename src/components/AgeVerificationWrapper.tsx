import React, { useEffect, useState } from 'react';
import { useLocation } from "@/lib/router-compat";
import AgeVerification from './AgeVerification';
import JoinChoiceModal from './JoinChoiceModal';
import { AGE_OK_KEY, JOIN_FLOW_EVENT } from '@/lib/joinFlow';
import { normalizeRefParam } from '@/lib/utils';

interface AgeVerificationWrapperProps {
  children: React.ReactNode;
}

/**
 * Home page loads immediately behind a blurred 18+ gate (remembered in localStorage).
 * Join Free / Start Free buttons open the New-or-Returning pop-up, then the short form flow.
 */
const AgeVerificationWrapper: React.FC<AgeVerificationWrapperProps> = ({ children }) => {
  const location = useLocation();
  const [gateOpen, setGateOpen] = useState(true);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [flowOpen, setFlowOpen] = useState(false);
  const [refCode, setRefCode] = useState("");

  useEffect(() => {
    try {
      if (localStorage.getItem(AGE_OK_KEY) === "true") setGateOpen(false);
    } catch { /* ignore */ }
    setRefCode(normalizeRefParam(new URLSearchParams(window.location.search).get("ref")) || "");
    const open = () => setChoiceOpen(true);
    window.addEventListener(JOIN_FLOW_EVENT, open);
    return () => window.removeEventListener(JOIN_FLOW_EVENT, open);
  }, []);

  // ?signup=1 jumps straight into the short form flow.
  useEffect(() => {
    const params = new URLSearchParams(location.search || window.location.search);
    if (params.get('signup') === '1') {
      setGateOpen(false);
      setFlowOpen(true);
    }
  }, [location.key, location.search, location.pathname]);

  return (
    <>
      <div className={gateOpen ? "pointer-events-none select-none blur-md" : ""} aria-hidden={gateOpen}>
        {children}
      </div>
      {gateOpen && <AgeVerification mode="gate" onVerified={() => setGateOpen(false)} />}
      {choiceOpen && (
        <JoinChoiceModal
          refCode={refCode}
          onClose={() => setChoiceOpen(false)}
          onNew={() => { setChoiceOpen(false); setFlowOpen(true); }}
        />
      )}
      {flowOpen && <AgeVerification mode="join" initialStep="role" onVerified={() => setFlowOpen(false)} />}
    </>
  );
};

export default AgeVerificationWrapper;
