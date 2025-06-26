import React from 'react';
import { Button } from '@/components/ui/button';

interface EventsHeaderProps {
  performerUsername: string;
}

const EventsHeader: React.FC<EventsHeaderProps> = ({ performerUsername }) => {
  return (
    <div className="text-center mb-8">
      <div className="w-60 h-60 md:w-80 md:h-80 rounded-full mx-auto mb-4 border-4 border-yellow-400 overflow-hidden">
        <img 
          src="https://dimesonly.world/wp-content/uploads/2025/03/image-19.jpg" 
          alt={performerUsername}
          className="w-full h-full object-cover"
        />
      </div>
      <h1 className="text-2xl md:text-3xl font-bold text-yellow-400 mb-2">@{performerUsername}</h1>
      <div className="text-white text-lg font-bold mb-2">IF YOU SEE A ✅ I AM GOING</div>
      <div className="text-gray-400 italic font-bold mb-4">TIP ME TO HANG OUT</div>
      <Button className="bg-yellow-400 text-black hover:bg-yellow-500 px-8 py-3 font-bold">
        MESSAGE ME
      </Button>
    </div>
  );
};

export default EventsHeader;