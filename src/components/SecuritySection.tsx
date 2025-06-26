import React from 'react';
import { Shield, Lock, CreditCard } from 'lucide-react';

interface SecuritySectionProps {
  className?: string;
}

const SecuritySection: React.FC<SecuritySectionProps> = ({ className = '' }) => {
  return (
    <div className={`bg-gradient-to-b from-gray-900 to-black py-16 px-4 ${className}`}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-white text-3xl md:text-5xl font-bold mb-4">
            SECURE & TRUSTED PLATFORM
          </h2>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Your privacy and security are our top priorities. We use industry-leading encryption and security measures.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="text-center">
            <Shield className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-white text-xl font-semibold mb-2">SSL Encrypted</h3>
            <p className="text-gray-400">All data transmission is protected with 256-bit SSL encryption</p>
          </div>
          
          <div className="text-center">
            <Lock className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            <h3 className="text-white text-xl font-semibold mb-2">Privacy Protected</h3>
            <p className="text-gray-400">Your personal information is never shared with third parties</p>
          </div>
          
          <div className="text-center">
            <CreditCard className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h3 className="text-white text-xl font-semibold mb-2">Secure Payments</h3>
            <p className="text-gray-400">PCI compliant payment processing for all transactions</p>
          </div>
        </div>

        <div className="flex justify-center items-center gap-8 mt-8 flex-wrap">
          <img 
            src="https://dimesonly.s3.us-east-2.amazonaws.com/visa-100x77.png" 
            alt="Visa" 
            className="w-16 h-auto hover:opacity-80 transition-opacity"
          />
          <img 
            src="https://dimesonly.s3.us-east-2.amazonaws.com/mastercard-e1742175183205-100x71.png" 
            alt="MasterCard" 
            className="w-16 h-auto hover:opacity-80 transition-opacity"
          />
          <img 
            src="https://dimesonly.s3.us-east-2.amazonaws.com/american-express-100x72.png" 
            alt="American Express" 
            className="w-16 h-auto hover:opacity-80 transition-opacity"
          />
        </div>
      </div>
    </div>
  );
};

export default SecuritySection;