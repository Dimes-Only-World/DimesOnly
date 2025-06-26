import React from 'react';

interface AgeVerificationProps {
  onVerified: () => void;
}

const AgeVerification: React.FC<AgeVerificationProps> = ({ onVerified }) => {
  const handleVerify = () => {
    console.log('Age verification button clicked');
    try {
      // Use sessionStorage instead of localStorage for temporary verification
      sessionStorage.setItem('ageVerifiedThisSession', 'true');
      console.log('Age verification saved to sessionStorage');
      if (typeof onVerified === 'function') {
        onVerified();
        console.log('onVerified callback called');
      } else {
        console.error('onVerified is not a function:', onVerified);
      }
    } catch (error) {
      console.error('Error in handleVerify:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 text-white p-4 sm:p-8 rounded-2xl border-4 border-orange-500 shadow-2xl max-w-4xl w-full flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
        <div className="flex-shrink-0 w-full sm:w-auto">
          <video 
            autoPlay 
            muted 
            loop 
            className="w-full sm:w-64 h-48 object-cover rounded-lg border-2 border-orange-500"
          >
            <source src="https://dimesonlyworld.s3.us-east-2.amazonaws.com/o3+(1).mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

        <div className="text-center flex-1">
          <h2 className="text-orange-500 text-xl sm:text-2xl font-bold mb-4">
            WARNING: This site is for adults only!
          </h2>
          <p className="mb-6 text-xs sm:text-sm leading-relaxed">
            By entering this website, I acknowledge that I am 18 years old or older and agree to the Terms of Service, which are available per request at the footer of the website.
          </p>
          <button 
            onClick={handleVerify}
            type="button"
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition-colors text-sm sm:text-base cursor-pointer"
          >
            ENTER - I am 18 years old or older
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgeVerification;