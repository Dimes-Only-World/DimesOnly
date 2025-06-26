import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  city: string;
  state: string;
  category: string;
  image: string;
  hostedBy: string;
  attendees: string[];
  ticketPrice: number;
  maxTickets: number;
  isAttending: boolean;
}

interface EventsGridProps {
  events: Event[];
  onViewAttendees: (event: Event) => void;
  onPurchaseTickets: (event: Event) => void;
}

const EventsGrid: React.FC<EventsGridProps> = ({ events, onViewAttendees, onPurchaseTickets }) => {
  return (
    <div className="space-y-6">
      {events.map(event => (
        <Card key={event.id} className="bg-gray-900 border-gray-700 overflow-hidden hover:border-yellow-400 transition-colors">
          <div className="flex flex-col md:flex-row">
            <img 
              src={event.image} 
              alt={event.title}
              className="w-full md:w-80 h-64 object-cover"
            />
            <CardContent className="flex-1 p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-2xl font-bold text-yellow-400">{event.title}</h3>
                <div className="flex items-center gap-2">
                  {event.isAttending ? (
                    <Badge className="bg-green-600 text-white">✅ Going</Badge>
                  ) : (
                    <Badge className="bg-red-600 text-white">❌ Not Going</Badge>
                  )}
                </div>
              </div>
              
              <div className="text-gray-300 mb-4 space-y-2">
                <p>📅 <strong className="text-white">Date:</strong> {event.date}</p>
                <p>🕒 <strong className="text-white">Time:</strong> {event.time}</p>
                <p>📍 <strong className="text-white">Location:</strong> {event.location}</p>
                <p>🎤 <strong className="text-white">Hosted by:</strong> {event.hostedBy}</p>
                <p>💰 <strong className="text-white">Ticket Price:</strong> ${event.ticketPrice}</p>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={() => onPurchaseTickets(event)}
                  className="bg-yellow-400 text-black hover:bg-yellow-500"
                >
                  Get Tickets
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => onViewAttendees(event)}
                  className="border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black"
                >
                  View Attendees
                </Button>
              </div>
            </CardContent>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default EventsGrid;