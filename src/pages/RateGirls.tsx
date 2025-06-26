import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, User, MapPin, Flag } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import UsersList from '@/components/UsersList';
import RatingStatusChecker from '@/components/RatingStatusChecker';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  username: string;
  profile_photo: string;
  city: string;
  state: string;
  user_type: string;
}

const RateGirls: React.FC = () => {
  const [searchParams] = useSearchParams();
  const rateUsername = searchParams.get('rate');
  const refUsername = searchParams.get('ref') || '';
  const [searchName, setSearchName] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [searchState, setSearchState] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  const handleUserSelect = (user: User) => {
    const url = `/rate/?rate=${user.username}${refUsername ? `&ref=${refUsername}` : ''}`;
    window.location.href = url;
  };

  const clearFilters = () => {
    setSearchName('');
    setSearchCity('');
    setSearchState('');
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
              <span className="text-red-500">RATE GIRLS PAGE</span>
              <br />
              How it works:
            </h2>
            
            <p className="text-white text-lg leading-relaxed max-w-4xl mx-auto">
              Begin by rating the ladies. For every 100 new females who join, you will receive a text notification to rate the next group of 100 images during your available time. The top-rated females will be featured at the top of each subsequent group of 100.
            </p>
          </div>

          {/* Search Section */}
          <div className="max-w-6xl mx-auto mb-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Find Your Favorite Dancer</h2>
              <p className="text-gray-300">Search by name, city, or state to discover amazing performers</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur rounded-2xl p-8 shadow-lg border border-white/20">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="relative group">
                  <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
                    <User size={16} className="text-blue-400" />
                    Search by Name
                  </label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <Input
                      type="text"
                      placeholder="e.g., Miami, Sky, Mercedes..."
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white/20 border-2 border-white/30 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-white placeholder-gray-300"
                    />
                  </div>
                </div>
                
                <div className="relative group">
                  <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
                    <MapPin size={16} className="text-green-400" />
                    Search by City
                  </label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <Input
                      type="text"
                      placeholder="e.g., Phoenix, Las Vegas, Dallas..."
                      value={searchCity}
                      onChange={(e) => setSearchCity(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white/20 border-2 border-white/30 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 text-white placeholder-gray-300"
                    />
                  </div>
                </div>
                
                <div className="relative group">
                  <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-2">
                    <Flag size={16} className="text-purple-400" />
                    Search by State
                  </label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <Input
                      type="text"
                      placeholder="e.g., AZ, CA, TX, NV..."
                      value={searchState}
                      onChange={(e) => setSearchState(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white/20 border-2 border-white/30 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 text-white placeholder-gray-300"
                    />
                  </div>
                </div>
              </div>
              
              {(searchName || searchCity || searchState) && (
                <div className="mt-6 text-center">
                  <Button
                    onClick={clearFilters}
                    variant="outline"
                    className="inline-flex items-center gap-2 px-6 py-3 border-white/30 text-white hover:bg-white/20"
                  >
                    <Search size={16} />
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Status Message */}
          {currentUser && (
            <RatingStatusChecker userId={currentUser.id}>
              {(hasRatings, hasBeenRated) => {
                if (!hasRatings && !hasBeenRated) {
                  return (
                    <Card className="bg-red-900/20 border-red-500 mb-6 max-w-4xl mx-auto">
                      <CardContent className="p-4 text-center">
                        <h3 className="text-red-400 font-bold text-lg mb-2">
                          NO RATES YET MADE IN 2025. BE THE 1ST!
                        </h3>
                        <p className="text-red-300 text-sm">
                          Start rating your favorite dancers to help them climb the rankings!
                        </p>
                      </CardContent>
                    </Card>
                  );
                }
                return null;
              }}
            </RatingStatusChecker>
          )}

          {/* Users List */}
          <UsersList
            searchName={searchName}
            searchCity={searchCity}
            searchState={searchState}
            onUserSelect={handleUserSelect}
            actionType="rate"
            noDataMessage="NO RATES YET IN 2025. BE THE 1ST!"
          />
        </div>
      </div>
    </AuthGuard>
  );
};

export default RateGirls;