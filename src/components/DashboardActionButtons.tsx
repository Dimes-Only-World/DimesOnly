import React from 'react';
import { Button } from '@/components/ui/button';
import { Trophy, Calendar, Star, Edit } from 'lucide-react';

interface DashboardActionButtonsProps {
  userData?: {
    username: string;
    user_type: string;
    gender: string;
  };
}

const DashboardActionButtons: React.FC<DashboardActionButtonsProps> = ({ userData }) => {
  const handleTipWin = () => {
    const username = userData?.username || 'demo';
    window.open(`https://dimesonly.world/tip-girls?ref=${username}`, '_blank');
  };

  const handleEvents = () => {
    const username = userData?.username || 'demo';
    const userType = userData?.user_type;
    
    if (userType === 'stripper' || userType === 'exotic') {
      window.open(`https://dimesonly.world/events-dimes-only?ref=${username}`, '_blank');
    } else {
      window.open(`https://dimesonly.world/eventsdimes?ref=${username}`, '_blank');
    }
  };

  const handleRate = () => {
    window.open('https://dimesonly.world/rate-girls', '_blank');
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
      <Button
        onClick={handleTipWin}
        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-lg shadow-lg transform transition hover:scale-105 flex flex-col items-center gap-2"
      >
        <Trophy className="w-6 h-6" />
        TIP & WIN
      </Button>
      
      <Button
        onClick={handleEvents}
        className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold py-4 px-6 rounded-lg shadow-lg transform transition hover:scale-105 flex flex-col items-center gap-2"
      >
        <Calendar className="w-6 h-6" />
        EVENTS
      </Button>
      
      <Button
        onClick={handleRate}
        className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-4 px-6 rounded-lg shadow-lg transform transition hover:scale-105 flex flex-col items-center gap-2"
      >
        <Star className="w-6 h-6" />
        RATE
      </Button>
      
      <Button
        className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-4 px-6 rounded-lg shadow-lg transform transition hover:scale-105 flex flex-col items-center gap-2"
      >
        <Edit className="w-6 h-6" />
        EDIT PROFILE
      </Button>
    </div>
  );
};

export default DashboardActionButtons;