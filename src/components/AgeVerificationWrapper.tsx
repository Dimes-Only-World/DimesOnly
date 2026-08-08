import React, { useState, useEffect } from 'react';
import AgeVerification from './AgeVerification';

interface AgeVerificationWrapperProps {
  children: React.ReactNode;
}

const AgeVerificationWrapper: React.FC<AgeVerificationWrapperProps> = ({ children }) => {
  const [showAgeVerification, setShowAgeVerification] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Skip the gate for the rest of the browser session once completed.
    localStorage.removeItem('ageVerified');
    const done = sessionStorage.getItem('ageVerifiedThisSession') === 'true';
    setShowAgeVerification(!done);
    setIsLoading(false);
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