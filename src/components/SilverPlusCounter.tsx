import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface CounterData {
  current_count: number;
  max_count: number;
  available: boolean;
  remaining: number;
}

const SilverPlusCounter: React.FC = () => {
  const [counterData, setCounterData] = useState<CounterData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial fetch
    fetchCounterData();

    // Set up real-time subscription
    const subscription = supabase
      .channel('silver_plus_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: 'silver_plus_active=eq.true'
        },
        (payload) => {
          // When a user's silver_plus_active changes, refetch the counter
          fetchCounterData();
        }
      )
      .subscribe();

    // Clean up subscription on unmount
    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchCounterData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .rpc('check_silver_plus_availability');

      if (error) {
        console.error("Error fetching Silver Plus counter:", error);
        return;
      }

      if (data && data.length > 0) {
        const counterInfo = data[0];
        setCounterData({
          current_count: counterInfo.current_count,
          max_count: counterInfo.max_count,
          available: counterInfo.available,
          remaining: counterInfo.max_count - counterInfo.current_count
        });
      }
    } catch (error) {
      console.error("Error fetching Silver Plus counter:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="text-center py-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  if (!counterData) {
    return (
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="text-center py-6">
          <p>Unable to load counter data</p>
        </CardContent>
      </Card>
    );
  }

  const remaining = counterData.max_count - counterData.current_count;
  const percentage = (counterData.current_count / counterData.max_count) * 100;

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Crown className="w-6 h-6 text-blue-600" />
          <CardTitle className="text-blue-800">Silver Plus Memberships</CardTitle>
        </div>
        <Badge variant="secondary" className="bg-blue-600 text-white">
          Limited Time Offer
        </Badge>
      </CardHeader>
      <CardContent className="text-center">
        <div className="mb-4">
          <div className="text-3xl font-bold text-blue-800 mb-2">
            {remaining.toLocaleString()} of {counterData.max_count.toLocaleString()}
          </div>
          <p className="text-blue-700 text-sm">
            Silver Plus memberships remaining
          </p>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-blue-200 rounded-full h-3 mb-4">
          <div 
            className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          ></div>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-blue-700">
          <Users className="w-4 h-4" />
          <span>{counterData.current_count.toLocaleString()} members joined</span>
        </div>

        {!counterData.available && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm font-medium">
              All Silver Plus memberships have been claimed! 
              It will become an annual subscription soon.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SilverPlusCounter; 