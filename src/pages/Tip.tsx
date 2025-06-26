import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, User, Calendar, Star } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import TipAmountSelector from '@/components/TipAmountSelector';
import PayPalTipButton from '@/components/PayPalTipButton';
import JackpotCountdown from '@/components/JackpotCountdown';
import { supabase } from '@/lib/supabase';

interface UserData {
  id: string;
  username: string;
  profile_photo: string;
  banner_photo?: string;
  city: string;
  state: string;
  bio?: string;
  user_type: string;
  created_at: string;
}

const Tip: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tipUsername = searchParams.get('tip');
  const refUsername = searchParams.get('ref') || '';
  const [tipAmount, setTipAmount] = useState(0);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [jackpotAmount, setJackpotAmount] = useState(0);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [digitalTicket, setDigitalTicket] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (tipUsername) {
      fetchUserData();
      fetchJackpotData();
    }
    getCurrentUser();
  }, [tipUsername]);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', tipUsername)
        .in('user_type', ['stripper', 'exotic'])
        .single();

      if (error) {
        console.error('Error fetching user data:', error);
        return;
      }

      setUserData(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchJackpotData = async () => {
    try {
      // Calculate 25% of total tips as jackpot
      const { data: tipsData } = await supabase
        .from('tips')
        .select('amount')
        .gte('created_at', '2025-01-01');

      if (tipsData) {
        const totalTips = tipsData.reduce((sum, tip) => sum + (tip.amount || 0), 0);
        const jackpot = Math.min(totalTips * 0.25, 250000); // Max $250k
        setJackpotAmount(jackpot);
      }
    } catch (error) {
      console.error('Error fetching jackpot data:', error);
    }
  };

  const getNextFriday = () => {
    const now = new Date();
    const friday = new Date(now);
    const daysUntilFriday = (5 - now.getDay() + 7) % 7;
    friday.setDate(now.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
    friday.setHours(18, 0, 0, 0);
    return friday.toISOString();
  };

  const handlePaymentSuccess = async (details: any) => {
    try {
      const tickets = generateTickets(tipAmount);
      setDigitalTicket(tickets[0]);
      
      // Record tip in database
      const { error } = await supabase
        .from('tips')
        .insert({
          tipper_id: currentUser?.id,
          tipped_user_id: userData?.id,
          amount: tipAmount,
          message: message || null,
          referred_by: refUsername || null,
          paypal_transaction_id: details.id
        });

      if (error) {
        console.error('Error recording tip:', error);
      }

      setShowSuccessDialog(true);
      fetchJackpotData(); // Refresh jackpot
    } catch (error) {
      console.error('Error processing tip:', error);
    }
  };

  const generateTickets = (amount: number) => {
    const tickets = [];
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    
    for (let i = 0; i < amount; i++) {
      let ticket = '';
      for (let j = 0; j < 7; j++) {
        ticket += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      tickets.push(ticket);
    }
    return tickets;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="bg-red-900/20 border-red-500">
          <CardContent className="p-8 text-center">
            <h2 className="text-red-400 font-bold text-xl mb-2">User Not Found</h2>
            <p className="text-red-300">The requested user could not be found.</p>
            <Button 
              onClick={() => window.location.href = '/tip-girls'}
              className="mt-4 bg-red-500 hover:bg-red-600"
            >
              Back to Tip Girls
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Jackpot at Top */}
        <div className="w-full bg-gradient-to-r from-yellow-600 to-yellow-800 py-4">
          <div className="max-w-4xl mx-auto px-4">
            <JackpotCountdown
              currentJackpot={jackpotAmount}
              targetAmount={1000}
              nextDrawDate={jackpotAmount >= 1000 ? getNextFriday() : undefined}
            />
          </div>
        </div>

        {/* Banner Photo */}
        {userData.banner_photo && (
          <div className="w-full h-64 relative overflow-hidden">
            <img
              src={userData.banner_photo}
              alt="Banner"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/30" />
          </div>
        )}

        <div className="max-w-6xl mx-auto p-4 -mt-16 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Profile */}
            <div className="lg:col-span-1">
              <Card className="bg-white/10 backdrop-blur border-white/20 shadow-2xl">
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <img
                      src={userData.profile_photo || '/placeholder.svg'}
                      alt={userData.username}
                      className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-yellow-400 shadow-lg object-cover"
                    />
                    <h2 className="text-2xl font-bold text-white mb-2">@{userData.username}</h2>
                    <div className="flex items-center justify-center gap-2 text-gray-300 mb-2">
                      <User size={16} />
                      <span className="capitalize">{userData.user_type}</span>
                    </div>
                    {userData.city && userData.state && (
                      <div className="flex items-center justify-center gap-2 text-gray-300 mb-2">
                        <MapPin size={16} />
                        <span>{userData.city}, {userData.state}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                      <Calendar size={14} />
                      <span>Joined {new Date(userData.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  {userData.bio && (
                    <div className="mb-4">
                      <h3 className="text-white font-semibold mb-2">About</h3>
                      <p className="text-gray-300 text-sm">{userData.bio}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Tipping */}
            <div className="lg:col-span-2">
              <Card className="bg-white/10 backdrop-blur border-white/20 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-3xl font-bold text-center text-white">
                    💎 Tip @{userData.username} 💎
                  </CardTitle>
                  <p className="text-center text-gray-300">
                    Support your favorite performer and enter the jackpot!
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <TipAmountSelector
                    selectedAmount={tipAmount}
                    onAmountChange={setTipAmount}
                  />

                  <div>
                    <label className="block text-white mb-2 font-semibold">Message (Optional)</label>
                    <textarea
                      placeholder="Leave a nice message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full p-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 resize-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      rows={3}
                      maxLength={200}
                    />
                  </div>

                  {tipAmount > 0 && currentUser && (
                    <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 rounded-xl p-6 border border-yellow-500/30">
                      <h3 className="text-white font-bold mb-4 text-center">Complete Your Tip</h3>
                      <PayPalTipButton
                        tipAmount={tipAmount}
                        tippedUsername={userData.username}
                        referrerUsername={refUsername}
                        tipperUsername={currentUser.email || 'anonymous'}
                        onSuccess={handlePaymentSuccess}
                      />
                      <p className="text-yellow-200 text-sm text-center mt-3">
                        🎟️ You'll receive {tipAmount} lottery tickets!
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Success Dialog */}
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="bg-gray-900 border-yellow-500">
            <DialogHeader>
              <DialogTitle className="text-yellow-500 text-center">🎉 Tip Successful!</DialogTitle>
              <DialogDescription className="text-white text-center">
                Thank you for your tip of ${tipAmount} to @{userData.username}!
              </DialogDescription>
            </DialogHeader>
            <div className="text-center py-4">
              <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold text-2xl p-4 rounded-lg mb-4 shadow-lg">
                🎟️ {digitalTicket}
              </div>
              <p className="text-white font-semibold mb-2">You received {tipAmount} lottery tickets!</p>
              <p className="text-gray-300 text-sm">Check your dashboard for all tickets</p>
            </div>
            <DialogFooter>
              <Button 
                onClick={() => setShowSuccessDialog(false)} 
                className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black hover:from-yellow-500 hover:to-yellow-600 w-full"
              >
                Awesome!
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
};

export default Tip;