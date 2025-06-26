import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Flag, User, Heart } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import JackpotDisplay from '@/components/JackpotDisplay';
import PayPalTipButton from '@/components/PayPalTipButton';
import TipAmountSelector from '@/components/TipAmountSelector';
import UserProfileCard from '@/components/UserProfileCard';
import UsersList from '@/components/UsersList';
import TipStatusChecker from '@/components/TipStatusChecker';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  username: string;
  profile_photo: string;
  city: string;
  state: string;
  user_type: string;
}

const TipGirls: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tipUsername = searchParams.get('tip');
  const refUsername = searchParams.get('ref') || 'demo';
  const [searchName, setSearchName] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [searchState, setSearchState] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [message, setMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (tipUsername) {
      fetchUserByUsername(tipUsername);
    }
  }, [tipUsername]);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  const fetchUserByUsername = async (username: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, profile_photo, city, state, user_type')
        .eq('username', username)
        .in('user_type', ['stripper', 'exotic'])
        .single();

      if (error) throw error;
      if (data) {
        setSelectedUser(data);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const handleUserSelect = (user: User) => {
    const currentUserUsername = currentUser?.user_metadata?.username || 'guest';
    const url = `/tip/?tip=${user.username}&ref=${currentUserUsername}`;
    window.location.href = url;
  };

  // If showing specific user for tipping
  if (selectedUser) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card className="bg-white/10 backdrop-blur border-white/20">
                  <CardHeader className="text-center">
                    <CardTitle className="text-white text-3xl mb-4">
                      <Heart className="w-8 h-8 inline-block mr-2 text-red-500" />
                      Tip @{selectedUser.username}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <UserProfileCard user={selectedUser} />
                    
                    <TipAmountSelector
                      selectedAmount={tipAmount}
                      onAmountChange={setTipAmount}
                    />
                    
                    <div>
                      <label className="block text-white mb-2">Message (Optional)</label>
                      <textarea
                        placeholder="Leave a nice message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 resize-none"
                        rows={3}
                        maxLength={200}
                      />
                    </div>
                    
                    {tipAmount > 0 && (
                      <PayPalTipButton
                        tipAmount={tipAmount}
                        tippedUsername={selectedUser.username}
                        referrerUsername={refUsername}
                        tipperUsername="current_user"
                      />
                    )}
                    
                    <Button
                      onClick={() => setSelectedUser(null)}
                      variant="outline"
                      className="w-full border-white/30 text-white hover:bg-white/20"
                    >
                      Back to Directory
                    </Button>
                  </CardContent>
                </Card>
              </div>
              
              <div className="lg:col-span-1">
                <JackpotDisplay
                  currentJackpot={2450}
                  nextDrawDate={new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()}
                  totalTickets={1250}
                />
              </div>
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  // Directory view
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
        <div className="max-w-7xl mx-auto p-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-yellow-400 mb-4">💎 Tip Amazing Dimes 💎</h1>
                <p className="text-gray-300">Support your favorite dancers and enter the jackpot!</p>
              </div>

              {/* Search Section */}
              <Card className="bg-white/10 backdrop-blur border-white/20 mb-6">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <Input
                        type="text"
                        placeholder="Search by name..."
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                        className="pl-10 bg-white/20 border-white/30 text-white placeholder-gray-300"
                      />
                    </div>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <Input
                        type="text"
                        placeholder="Search by city..."
                        value={searchCity}
                        onChange={(e) => setSearchCity(e.target.value)}
                        className="pl-10 bg-white/20 border-white/30 text-white placeholder-gray-300"
                      />
                    </div>
                    <div className="relative">
                      <Flag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <Input
                        type="text"
                        placeholder="Search by state..."
                        value={searchState}
                        onChange={(e) => setSearchState(e.target.value)}
                        className="pl-10 bg-white/20 border-white/30 text-white placeholder-gray-300"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Status Message */}
              {currentUser && (
                <TipStatusChecker userId={currentUser.id}>
                  {(hasTips, hasBeenTipped) => {
                    if (!hasTips && !hasBeenTipped) {
                      return (
                        <Card className="bg-yellow-900/20 border-yellow-500 mb-6">
                          <CardContent className="p-4 text-center">
                            <h3 className="text-yellow-400 font-bold text-lg mb-2">
                              NO TIPS YET MADE IN 2025. BE THE 1ST!
                            </h3>
                            <p className="text-yellow-300 text-sm">
                              Start tipping your favorite dancers to enter the jackpot!
                            </p>
                          </CardContent>
                        </Card>
                      );
                    }
                    return null;
                  }}
                </TipStatusChecker>
              )}

              {/* Users List */}
              <UsersList
                searchName={searchName}
                searchCity={searchCity}
                searchState={searchState}
                onUserSelect={handleUserSelect}
                actionType="tip"
                noDataMessage="NO TIPS YET IN 2025. BE THE 1ST!"
              />
            </div>

            <div className="lg:col-span-1">
              <JackpotDisplay
                currentJackpot={2450}
                nextDrawDate={new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()}
                totalTickets={1250}
              />
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
};

export default TipGirls;