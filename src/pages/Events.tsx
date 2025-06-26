import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Calendar, MapPin, Clock, User } from 'lucide-react';

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
}

interface UserProfile {
  username: string;
  profile_photo: string;
  city: string;
  state: string;
  user_type: string;
}

const Events: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const username = searchParams.get('events') || '';
  const ref = searchParams.get('ref') || '';
  
  const [events, setEvents] = useState<Event[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    location: '',
    date: ''
  });

  useEffect(() => {
    if (username) {
      fetchUserProfile();
      fetchUserEvents();
    }
  }, [username]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('username, profile_photo, city, state, user_type')
        .eq('username', username)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchUserEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('user_events')
        .select(`
          event_id,
          events (
            id,
            name,
            date,
            start_time,
            end_time,
            address,
            city,
            state,
            photo_url,
            genre,
            price
          )
        `)
        .eq('username', username);

      if (error) throw error;

      const userEvents = data?.map(item => item.events).filter(Boolean) || [];
      setEvents(userEvents as Event[]);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch user events',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesLocation = !filters.location || 
      event.city.toLowerCase().includes(filters.location.toLowerCase()) ||
      event.state.toLowerCase().includes(filters.location.toLowerCase()) ||
      event.address.toLowerCase().includes(filters.location.toLowerCase());
    const matchesDate = !filters.date || 
      event.date.includes(filters.date);
    return matchesLocation && matchesDate;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* User Profile Header */}
        {userProfile && (
          <div className="text-center mb-8">
            <div className="flex flex-col items-center mb-6">
              <img 
                src={userProfile.profile_photo || '/placeholder.svg'} 
                alt={userProfile.username}
                className="w-24 h-24 rounded-full object-cover border-4 border-yellow-400 mb-4"
              />
              <h1 className="text-4xl font-bold text-yellow-400 mb-2">
                @{userProfile.username}
              </h1>
              <div className="flex items-center gap-2 text-gray-300 mb-2">
                <MapPin className="h-4 w-4" />
                <span>{userProfile.city}, {userProfile.state}</span>
              </div>
              <Badge variant="outline" className="border-yellow-400 text-yellow-400 mb-4">
                {userProfile.user_type}
              </Badge>
              {ref && (
                <Badge variant="outline" className="border-gray-400 text-gray-400">
                  Referred by: {ref}
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            {username ? `${username}'s Selected Events` : 'Events'}
          </h2>
          <p className="text-gray-300">Events this performer will be attending</p>
        </div>

        {/* Filters */}
        <Card className="bg-white/10 backdrop-blur border-white/20 mb-8">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold text-yellow-400 mb-4">Filter Events</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Filter by location"
                  value={filters.location}
                  onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={filters.date}
                  onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
                  className="pl-10 bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Events Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">Loading events...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <Card className="bg-white/10 backdrop-blur border-white/20 max-w-md mx-auto">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold text-yellow-400 mb-4">No Events Selected Yet</h3>
                <p className="text-gray-300 mb-4">
                  {username ? `${username} hasn't selected any events yet.` : 'No events match your filters.'}
                </p>
                <p className="text-gray-400 text-sm">
                  CHECK BACK TOMORROW
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map(event => (
              <Card key={event.id} className="bg-white/10 backdrop-blur border-white/20 hover:bg-white/20 transition-all">
                <CardContent className="p-0">
                  <img 
                    src={event.photo_url || '/placeholder.svg'} 
                    alt={event.name}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-yellow-400 mb-3">{event.name}</h3>
                    <div className="space-y-2 text-gray-300 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-yellow-400" />
                        <span>{new Date(event.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-400" />
                        <span>{event.start_time} - {event.end_time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-yellow-400" />
                        <span>{event.address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-400">🎵</span>
                        <span>{event.genre}</span>
                      </div>
                      {event.price > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-yellow-400">💰</span>
                          <span>${event.price}</span>
                        </div>
                      )}
                    </div>
                    <Button className="w-full bg-yellow-400 text-black hover:bg-yellow-500">
                      Event Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Events;