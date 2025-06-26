import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/contexts/AppContext';
import AuthGuard from '@/components/AuthGuard';
import { Search, MapPin, Users, Calendar } from 'lucide-react';

interface Event {
  id: string;
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  address: string;
  city: string;
  state: string;
  photo_url: string;
  genre: string;
  price: number;
  free_spots_strippers: number;
  free_spots_exotics: number;
  attendees?: any[];
}

const EventsDimesOnly: React.FC = () => {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [searchCity, setSearchCity] = useState('');
  const [searchState, setSearchState] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const eventsPerPage = 20;

  // Check access control
  const canViewPage = user?.userType === 'stripper' || user?.userType === 'exotic';

  useEffect(() => {
    if (canViewPage) {
      fetchEvents();
    }
  }, [canViewPage]);

  useEffect(() => {
    filterEvents();
  }, [events, searchCity, searchState]);

  const fetchEvents = async () => {
    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (eventsError) throw eventsError;

      // Fetch attendees for each event
      const eventsWithAttendees = await Promise.all(
        (eventsData || []).map(async (event) => {
          const { data: attendees } = await supabase
            .from('user_events')
            .select(`
              user_id,
              users!inner(
                username,
                profile_photo,
                user_type
              )
            `)
            .eq('event_id', event.id);

          return { ...event, attendees: attendees || [] };
        })
      );

      setEvents(eventsWithAttendees);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch events',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterEvents = () => {
    let filtered = events;
    
    if (searchCity) {
      filtered = filtered.filter(event => 
        event.city.toLowerCase().includes(searchCity.toLowerCase())
      );
    }
    
    if (searchState) {
      filtered = filtered.filter(event => 
        event.state.toLowerCase().includes(searchState.toLowerCase())
      );
    }
    
    setFilteredEvents(filtered);
    setCurrentPage(1);
  };

  const handleEventClick = async (event: Event) => {
    const freeSpots = (event.free_spots_strippers || 0) + (event.free_spots_exotics || 0);
    
    if (freeSpots <= 0) {
      setSelectedEvent(event);
      setShowPayDialog(true);
      return;
    }

    // Join event for free
    try {
      const { error } = await supabase
        .from('user_events')
        .insert({
          user_id: user?.id,
          event_id: event.id,
          username: user?.username
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Successfully joined the event!'
      });

      fetchEvents(); // Refresh events
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to join event',
        variant: 'destructive'
      });
    }
  };

  const renderAttendees = (attendees: any[]) => {
    const strippers = attendees.filter(a => a.users.user_type === 'stripper').slice(0, 10);
    const exotics = attendees.filter(a => a.users.user_type === 'exotic').slice(0, 10);
    const males = attendees.filter(a => a.users.user_type === 'male').slice(0, 5);
    const females = attendees.filter(a => a.users.user_type === 'female').slice(0, 5);

    return (
      <div className="mt-4">
        <h4 className="text-sm font-semibold text-gray-300 mb-2">Going:</h4>
        <div className="flex flex-wrap gap-2">
          {[...strippers, ...exotics, ...males, ...females].map((attendee, index) => (
            <div key={index} className="flex items-center space-x-1 bg-white/10 rounded-full px-2 py-1">
              <img 
                src={attendee.users.profile_photo || '/placeholder.svg'} 
                alt={attendee.users.username}
                className="w-6 h-6 rounded-full object-cover"
              />
              <span className="text-xs text-white">{attendee.users.username}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!canViewPage) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
          <Card className="bg-white/10 backdrop-blur border-white/20 max-w-md">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-red-400 mb-4">Access Restricted</h2>
              <p className="text-white">This page is only available to Strippers and Exotic dancers.</p>
            </CardContent>
          </Card>
        </div>
      </AuthGuard>
    );
  }

  const paginatedEvents = filteredEvents.slice(
    (currentPage - 1) * eventsPerPage,
    currentPage * eventsPerPage
  );

  const totalPages = Math.ceil(filteredEvents.length / eventsPerPage);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-yellow-400 mb-4">Events for Strippers & Exotics</h1>
            <p className="text-gray-300">Select events you'd like to participate in</p>
          </div>

          {/* Search Filters */}
          <div className="flex gap-4 mb-8 max-w-md mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by city"
                value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
              />
            </div>
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by state"
                value={searchState}
                onChange={(e) => setSearchState(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-400">Loading events...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                {paginatedEvents.map(event => {
                  const freeSpots = (event.free_spots_strippers || 0) + (event.free_spots_exotics || 0);
                  return (
                    <Card key={event.id} className="bg-white/10 backdrop-blur border-white/20 hover:bg-white/20 transition-all cursor-pointer" onClick={() => handleEventClick(event)}>
                      <CardContent className="p-0">
                        <img 
                          src={event.photo_url || '/placeholder.svg'} 
                          alt={event.name}
                          className="w-full h-48 object-cover rounded-t-lg"
                        />
                        <div className="p-4">
                          <h3 className="text-lg font-bold text-yellow-400 mb-2">{event.name}</h3>
                          <div className="space-y-2 text-sm text-gray-300">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(event.date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span>{event.address}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span className={freeSpots > 0 ? 'text-green-400' : 'text-red-400'}>
                                {freeSpots > 0 ? `${freeSpots} free spots left` : 'No free spots'}
                              </span>
                            </div>
                          </div>
                          {event.attendees && event.attendees.length > 0 && renderAttendees(event.attendees)}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      onClick={() => setCurrentPage(page)}
                      className="w-10 h-10"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Payment Dialog */}
        <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
          <DialogContent className="bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-yellow-400">All Free Spots Are Gone!</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-white mb-4">
                ALL FREE SPOTS ARE GONE FOR THIS EVENT. YOU CAN PURCHASE A TICKET AND HAVE A PLUS 1 FOR FREE.
              </p>
              <p className="text-white">
                TO CONTINUE TO CHECK OUT, CLICK YES OR NO TO CHOOSE A DIFFERENT EVENT.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPayDialog(false)}>
                No - Choose Different Event
              </Button>
              <Button className="bg-yellow-400 text-black hover:bg-yellow-500" onClick={() => {
                // Handle PayPal checkout
                setShowPayDialog(false);
                toast({ title: 'Redirecting to PayPal...', description: 'Payment processing will be implemented.' });
              }}>
                Yes - Purchase Ticket
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
};

export default EventsDimesOnly;