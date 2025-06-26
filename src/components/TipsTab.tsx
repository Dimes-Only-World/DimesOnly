import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';

interface Tip {
  id: string;
  amount: number;
  from_user: string;
  to_user: string;
  created_at: string;
  message?: string;
}

const TipsTab: React.FC = () => {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTips();
  }, []);

  const fetchTips = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tips')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setTips(data || []);
    } catch (error) {
      console.error('Error fetching tips:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalTipsAmount = tips.reduce((sum, tip) => sum + tip.amount, 0);
  const averageTipAmount = tips.length > 0 ? totalTipsAmount / tips.length : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totalTipsAmount.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {tips.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Average Tip</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              ${averageTipAmount.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Recent Tips</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading...</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {tips.slice(0, 50).map((tip) => (
                <div key={tip.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <span className="font-medium text-lg">${tip.amount.toFixed(2)}</span>
                    <p className="text-sm text-gray-600">From: {tip.from_user} → To: {tip.to_user}</p>
                    {tip.message && (
                      <p className="text-sm text-gray-500 mt-1">"{tip.message}"</p>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(tip.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TipsTab;