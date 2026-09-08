import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AgeVerification from './AgeVerification';
import AngelLoader from './AngelLoader';

interface AgeVerificationWrapperProps {
  children: React.ReactNode;
}

const AgeVerificationWrapper: React.FC<AgeVerificationWrapperProps> = ({ children }) => {
  const location = useLocation();
  const [showAgeVerification, setShowAgeVerification] = useState(true);
  const [forceFormStep, setForceFormStep] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Always show the age gate on every return visit / page load.
    localStorage.removeItem('ageVerified');
    sessionStorage.removeItem('ageVerifiedThisSession');
    setShowAgeVerification(true);
    setIsLoading(false);
  }, []);

  // ?signup=1 forces the age gate back open directly on the short form step,
  // even if the visitor already verified during this session (e.g. the
  // "Sign up" link on /login navigates client-side without a reload).
  useEffect(() => {
    const params = new URLSearchParams(location.search || window.location.search);
    if (params.get('signup') === '1') {
      setForceFormStep(true);
      setShowAgeVerification(true);
    }
  }, [location.key, location.search, location.pathname]);



  const handleAgeVerified = () => {
    console.log('handleAgeVerified called');
    // Not persisted: the gate re-appears on the next visit / page load.
    setShowAgeVerification(false);
    console.log('Age verification modal hidden for this session');
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50">
        <AngelLoader variant="fullscreen" />
      </div>
    );
  }

  console.log('Rendering AgeVerificationWrapper, showAgeVerification:', showAgeVerification);

  return (
    <>
      {showAgeVerification ? (
        <AgeVerification onVerified={handleAgeVerified} initialStep={forceFormStep ? 'form' : undefined} />
      ) : (
        children
      )}
    </>
  );
};

export default AgeVerificationWrapper;