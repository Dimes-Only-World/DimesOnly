import React from 'react';
import { Button } from '@/components/ui/button';

const ActionButtons: React.FC = () => {
  const handleStartFree = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref') || 'default';
    window.location.href = `/register?ref=${encodeURIComponent(ref)}`;
  };

  const handleLogin = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref') || 'default';
    window.location.href = `/login?ref=${encodeURIComponent(ref)}`;
  };

  return (
    <div className="bg-black py-16 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-white text-3xl md:text-5xl font-bold mb-8">
          READY TO GET STARTED?
        </h2>
        
        <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
          <Button
            onClick={handleStartFree}
            className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-bold py-4 px-8 text-xl rounded-lg shadow-lg transform transition hover:scale-105"
          >
            START FREE
          </Button>
          
          <Button
            onClick={handleLogin}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold py-4 px-8 text-xl rounded-lg shadow-lg transform transition hover:scale-105"
          >
            LOGIN
          </Button>
        </div>
        
        <p className="text-gray-300 mt-6 text-lg">
          Join thousands of dancers and exotic performers earning money online
        </p>
      </div>
    </div>
  );
};

export default ActionButtons;