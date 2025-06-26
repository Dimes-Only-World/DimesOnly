import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, Ticket, ArrowLeft, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface UserData {
  tips_earned: number;
  referral_fees: number;
  user_type: string;
  username: string;
}

interface EarningsSectionProps {
  userData: UserData | null;
}

interface TipData {
  id: string;
  amount: number;
  created_at: string;
  from_user: string;
}

const EarningsSection: React.FC<EarningsSectionProps> = ({ userData }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [earningsData, setEarningsData] = useState({
    totalEarnings: 0,
    weeklyEarnings: 0,
    lotteryTickets: 0,
    tips: [] as TipData[],
    currentJackpot: 2450.00
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userData?.username) {
      fetchEarningsData();
    }
  }, [userData]);

  const fetchEarningsData = async () => {
    if (!userData?.username) return;
    
    try {
      const response = await fetch('https://qkcuykpndrolrewwnkwb.supabase.co/functions/v1/3c4efe55-887e-449b-87d0-79fa1745c70c', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: userData.username })
      });
      
      const result = await response.json();
      if (result.success) {
        setEarningsData(result.data);
      }
    } catch (error) {
      console.error('Error fetching earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (showDetails) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            onClick={() => setShowDetails(false)}
            variant="outline"
            className="text-white border-white hover:bg-white hover:text-black"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Earnings
          </Button>
          <h2 className="text-2xl font-bold text-white">Earnings Details</h2>
        </div>

        <Card className="bg-white/10 backdrop-blur border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Recent Tips Received
            </CardTitle>
          </CardHeader>
          <CardContent>
            {earningsData.tips.length === 0 ? (
              <div className="text-white text-center py-8">No tips received yet</div>
            ) : (
              <div className="space-y-4">
                {earningsData.tips.map((tip) => {
                  const earnings = tip.amount * 0.20;
                  return (
                    <div 
                      key={tip.id}
                      className="bg-white/5 rounded-lg p-4 border border-white/10"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="text-white font-semibold">Tip from {tip.from_user}</h4>
                          <p className="text-blue-200 text-sm flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(tip.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-green-400 font-bold">
                            +${earnings.toFixed(2)}
                          </p>
                          <p className="text-gray-300 text-sm">
                            20% of ${tip.amount.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return <div className="text-white text-center py-8">Loading earnings data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white/10 backdrop-blur border-white/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <DollarSign className="w-5 h-5 text-green-400" />
              Total Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400 mb-2">
              ${earningsData.totalEarnings.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur border-white/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              Weekly Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400 mb-2">
              ${earningsData.weeklyEarnings.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur border-white/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <Ticket className="w-5 h-5 text-purple-400" />
              Lottery Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-400 mb-2">
              {earningsData.lotteryTickets}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur border-white/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <DollarSign className="w-5 h-5 text-yellow-400" />
              Current Jackpot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-400 mb-2">
              ${earningsData.currentJackpot.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/10 backdrop-blur border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Recent Tips Received</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {earningsData.tips.length === 0 ? (
              <p className="text-gray-300">No tips received yet</p>
            ) : (
              earningsData.tips.slice(0, 3).map((tip) => (
                <div key={tip.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                      {tip.from_user.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{tip.from_user}</p>
                      <p className="text-gray-300 text-sm">
                        {new Date(tip.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-bold">${tip.amount.toFixed(2)}</p>
                    <p className="text-gray-300 text-sm">{Math.floor(tip.amount)} tickets</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/10 backdrop-blur border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Jackpot Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center p-4 bg-yellow-500/20 rounded-lg">
              <div className="text-4xl font-bold text-yellow-400 mb-2">
                ${earningsData.currentJackpot.toFixed(2)}
              </div>
              <p className="text-white">Current Weekly Jackpot</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-white/5 rounded">
                <div className="text-xl font-bold text-green-400">
                  ${(earningsData.currentJackpot * 0.25).toFixed(2)}
                </div>
                <p className="text-white text-sm">Grand Prize</p>
                <p className="text-gray-300 text-xs">25% of jackpot</p>
              </div>
              
              <div className="text-center p-3 bg-white/5 rounded">
                <div className="text-xl font-bold text-blue-400">
                  ${(earningsData.currentJackpot * 0.03).toFixed(2)}
                </div>
                <p className="text-white text-sm">2nd Place</p>
                <p className="text-gray-300 text-xs">3% of jackpot</p>
              </div>
              
              <div className="text-center p-3 bg-white/5 rounded">
                <div className="text-xl font-bold text-purple-400">
                  ${(earningsData.currentJackpot * 0.02).toFixed(2)}
                </div>
                <p className="text-white text-sm">3rd Place</p>
                <p className="text-gray-300 text-xs">2% of jackpot</p>
              </div>
            </div>
            
            <div className="text-center p-3 bg-white/5 rounded">
              <p className="text-white font-semibold">Your tickets: {earningsData.lotteryTickets}</p>
              <p className="text-gray-300 text-sm">Drawing every Friday when jackpot reaches $1,000+</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button 
        onClick={() => setShowDetails(true)}
        className="w-full bg-green-600 hover:bg-green-700 text-white"
      >
        View Detailed Earnings
      </Button>
    </div>
  );
};

export default EarningsSection;