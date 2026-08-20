import React, { useState, useEffect } from 'react';
import AgeVerification from './AgeVerification';
import AngelLoader from './AngelLoader';

interface AgeVerificationWrapperProps {
  children: React.ReactNode;
}

const AgeVerificationWrapper: React.FC<AgeVerificationWrapperProps> = ({ children }) => {
  const [showAgeVerification, setShowAgeVerification] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Always show the age gate on every return visit / page load.
    localStorage.removeItem('ageVerified');
    sessionStorage.removeItem('ageVerifiedThisSession');
    setShowAgeVerification(true);
    setIsLoading(false);
  }, []);


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
        <AgeVerification onVerified={handleAgeVerified} />
      ) : (
        children
      )}
    </>
  );
};

export default AgeVerificationWrapper;