import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const JackpotDisplay: React.FC = () => {
  const [jackpotAmount, setJackpotAmount] = useState(0.00);

  useEffect(() => {
    const fetchJackpot = async () => {
      try {
        const { data, error } = await supabase
          .from('jackpot')
          .select('amount')
          .single();
        
        if (data && !error && data.amount !== null && data.amount !== undefined) {
          setJackpotAmount(Number(data.amount) || 0);
        }
      } catch (error) {
        console.error('Error fetching jackpot:', error);
      }
    };

    fetchJackpot();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('jackpot_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'jackpot' },
        (payload) => {
          if (payload.new && typeof payload.new === 'object' && 'amount' in payload.new) {
            const newAmount = payload.new.amount;
            if (newAmount !== null && newAmount !== undefined) {
              setJackpotAmount(Number(newAmount) || 0);
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const formatCurrency = (amount: number | null | undefined) => {
    const safeAmount = Number(amount) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(safeAmount);
  };

  return (
    <Card className="bg-gradient-to-br from-yellow-900 to-orange-900 border-yellow-600">
      <CardHeader className="text-center pb-2">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Trophy className="w-8 h-8 text-yellow-400" />
          <CardTitle className="text-2xl font-bold text-yellow-100">
            JACKPOT
          </CardTitle>
        </div>
        <div className="text-5xl font-bold text-yellow-300 mb-2">
          {formatCurrency(jackpotAmount)}
        </div>
      </CardHeader>
    </Card>
  );
};

export default JackpotDisplay;