import React, { useState, useEffect } from 'react';
import AgeVerification from './AgeVerification';

interface AgeVerificationWrapperProps {
  children: React.ReactNode;
}

const AgeVerificationWrapper: React.FC<AgeVerificationWrapperProps> = ({ children }) => {
  const [showAgeVerification, setShowAgeVerification] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Always show age verification on home page visits
    // Remove any existing verification to ensure it shows every time
    localStorage.removeItem('ageVerified');
    setShowAgeVerification(true);
    setIsLoading(false);
    console.log('Age verification will be shown on home page visit');
  }, []);

  const handleAgeVerified = () => {
    console.log('handleAgeVerified called');
    // Set temporary verification for this session only
    sessionStorage.setItem('ageVerifiedThisSession', 'true');
    setShowAgeVerification(false);
    console.log('Age verification modal hidden for this session');
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-white text-xl">Loading...</div>
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