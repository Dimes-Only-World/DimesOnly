import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Check } from 'lucide-react';

interface Event {
  id: number;
  title: string;
  date: string;
  time: string;
  location: string;
  city: string;
  state: string;
  category: string;
  image: string;
  attendees: number;
  maxAttendees: number;
  isAttending: boolean;
}

interface EventCardProps {
  event: Event;
  onAttendClick: (event: Event) => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, onAttendClick }) => {
  return (
    <Card className="bg-gray-900 border-gray-700 overflow-hidden">
      <img 
        src={event.image} 
        alt={event.title}
        className="w-full h-48 object-cover"
      />
      <CardContent className="p-6">
        <h3 className="text-xl font-bold text-yellow-400 mb-2">{event.title}</h3>
        <div className="text-gray-300 mb-4 space-y-1">
          <p><strong>Date:</strong> {event.date}</p>
          <p><strong>Time:</strong> {event.time}</p>
          <p><strong>Location:</strong> {event.location}</p>
          <p><strong>Category:</strong> {event.category}</p>
          <p><strong>Attendees:</strong> {event.attendees}/{event.maxAttendees}</p>
        </div>
        
        <div className="flex items-center gap-2 mb-4">
          {event.isAttending ? (
            <div className="flex items-center gap-2 text-green-400">
              <Check size={20} />
              <span>Attending</span>
            </div>
          ) : (
            <Button
              onClick={() => onAttendClick(event)}
              disabled={event.attendees >= event.maxAttendees}
              className="bg-yellow-400 text-black hover:bg-yellow-500 font-bold"
            >
              ATTEND
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EventCard;