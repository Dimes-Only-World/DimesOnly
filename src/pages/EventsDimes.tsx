import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/contexts/AppContext';
import AuthGuard from '@/components/AuthGuard';
import { Search, MapPin, User } from 'lucide-react';

interface Performer {
  id: string;
  username: string;
  profile_photo: string;
  city: string;
  state: string;
  user_type: 'stripper' | 'exotic';
}

const EventsDimes: React.FC = () => {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [performers, setPerformers] = useState<Performer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    username: '',
    city: '',
    state: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const performersPerPage = 30;

  // Check access control - only males and normal females
  const canViewPage = user?.userType === 'male' || user?.userType === 'female';

  useEffect(() => {
    if (canViewPage) {
      fetchPerformers();
    }
  }, [canViewPage]);

  const fetchPerformers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, profile_photo, city, state, user_type')
        .in('user_type', ['stripper', 'exotic'])
        .order('username');

      if (error) throw error;
      setPerformers(data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch performers',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredPerformers = performers.filter(performer => {
    return (
      (filters.username === '' || performer.username.toLowerCase().includes(filters.username.toLowerCase())) &&
      (filters.city === '' || performer.city?.toLowerCase().includes(filters.city.toLowerCase())) &&
      (filters.state === '' || performer.state?.toLowerCase().includes(filters.state.toLowerCase()))
    );
  });

  const paginatedPerformers = filteredPerformers.slice(
    (currentPage - 1) * performersPerPage,
    currentPage * performersPerPage
  );

  const handleLetsGo = (performerUsername: string) => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref') || user?.username || 'guest';
    navigate(`/events?events=${performerUsername}&ref=${ref}`);
  };

  if (!canViewPage) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
          <Card className="bg-white/10 backdrop-blur border-white/20 max-w-md">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-red-400 mb-4">Access Restricted</h2>
              <p className="text-white">This page is only available to Male and Female users.</p>
            </CardContent>
          </Card>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-yellow-400 mb-4">Choose Your Event Partner</h1>
            <p className="text-gray-300">Select a stripper or exotic dancer to attend events with</p>
          </div>

          {/* Filters */}
          <Card className="bg-white/10 backdrop-blur border-white/20 mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
                <Search className="h-5 w-5" />
                Filter Performers
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by username"
                    value={filters.username}
                    onChange={(e) => setFilters(prev => ({ ...prev, username: e.target.value }))}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
                  />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by city"
                    value={filters.city}
                    onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
                  />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by state"
                    value={filters.state}
                    onChange={(e) => setFilters(prev => ({ ...prev, state: e.target.value }))}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-400">Loading performers...</p>
            </div>
          ) : (
            <>
              {/* Performers Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {paginatedPerformers.map(performer => (
                  <Card key={performer.id} className="bg-white/10 backdrop-blur border-white/20 hover:bg-white/20 transition-all">
                    <CardContent className="p-6 text-center">
                      <img 
                        src={performer.profile_photo || '/placeholder.svg'} 
                        alt={performer.username}
                        className="w-32 h-32 rounded-full mx-auto mb-4 object-cover border-4 border-yellow-400"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder.svg';
                        }}
                      />
                      
                      <h3 className="text-xl font-bold text-yellow-400 mb-2">@{performer.username}</h3>
                      
                      <div className="text-gray-300 mb-4 space-y-1">
                        <p className="flex items-center justify-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {performer.city || 'N/A'}, {performer.state || 'N/A'}
                        </p>
                        <p className="capitalize text-sm bg-white/10 px-2 py-1 rounded inline-block">
                          {performer.user_type}
                        </p>
                      </div>

                      <Button 
                        onClick={() => handleLetsGo(performer.username)}
                        className="w-full bg-yellow-400 text-black hover:bg-yellow-500 font-bold"
                      >
                        LET'S GO
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* No Results */}
              {filteredPerformers.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-xl">No performers found matching your criteria</p>
                </div>
              )}

              {/* Pagination */}
              {filteredPerformers.length > performersPerPage && (
                <div className="flex justify-center mt-8 gap-4">
                  <Button 
                    variant="outline" 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    className="border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black"
                  >
                    Previous
                  </Button>
                  <span className="flex items-center px-4 text-white">
                    Page {currentPage} of {Math.ceil(filteredPerformers.length / performersPerPage)}
                  </span>
                  <Button 
                    variant="outline" 
                    disabled={currentPage >= Math.ceil(filteredPerformers.length / performersPerPage)}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className="border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black"
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  );
};

export default EventsDimes;