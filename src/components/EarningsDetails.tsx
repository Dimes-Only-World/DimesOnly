import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface TipData {
  id: string;
  amount: number;
  created_at: string;
  from_user: string;
  to_user: string;
}

interface EarningsDetailsProps {
  onBack: () => void;
  userType: string;
  tips: TipData[];
}

const EarningsDetails: React.FC<EarningsDetailsProps> = ({ onBack, userType, tips }) => {
  const [allTips, setAllTips] = useState<TipData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllTips();
  }, []);

  const fetchAllTips = async () => {
    try {
      const { data, error } = await supabase
        .from('tips')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllTips(data || []);
    } catch (error) {
      console.error('Error fetching tips:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateEarnings = (tipAmount: number) => {
    // 20% of tip amount goes to the user
    return tipAmount * 0.20;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button 
          onClick={onBack}
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
            Detailed Earnings History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-white text-center py-8">Loading earnings data...</div>
          ) : allTips.length === 0 ? (
            <div className="text-white text-center py-8">No earnings data available yet</div>
          ) : (
            <div className="space-y-4">
              {allTips.map((tip) => {
                const earnings = calculateEarnings(tip.amount);
                return (
                  <div 
                    key={tip.id}
                    className="bg-white/5 rounded-lg p-4 border border-white/10"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="text-white font-semibold">Tip Received</h4>
                        <p className="text-blue-200 text-sm flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(tip.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-gray-300 text-sm">
                          From: {tip.from_user} → To: {tip.to_user}
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
                    <div className="text-xs text-gray-400">
                      Platform commission from tip transaction
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white/10 backdrop-blur border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Earning Rates Explanation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-white">
            <div className="flex justify-between items-center p-3 bg-white/5 rounded">
              <span>Platform commission from tips</span>
              <span className="text-green-400 font-bold">20%</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white/5 rounded">
              <span>Lottery tickets earned</span>
              <span className="text-green-400 font-bold">1 per $1 tipped</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white/5 rounded">
              <span>Weekly jackpot drawing</span>
              <span className="text-green-400 font-bold">Every Friday</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white/5 rounded">
              <span>Minimum jackpot for drawing</span>
              <span className="text-green-400 font-bold">$1,000</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EarningsDetails;