import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface TipStatusCheckerProps {
  userId: string;
  children: (hasTips: boolean, hasBeenTipped: boolean) => React.ReactNode;
}

const TipStatusChecker: React.FC<TipStatusCheckerProps> = ({ userId, children }) => {
  const [hasTips, setHasTips] = useState(false);
  const [hasBeenTipped, setHasBeenTipped] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkTipStatus();
  }, [userId]);

  const checkTipStatus = async () => {
    try {
      setLoading(true);
      
      // Check if user has made any tips
      const { data: userTips, error: tipsError } = await supabase
        .from('tips')
        .select('id')
        .eq('tipper_id', userId)
        .limit(1);

      if (tipsError) throw tipsError;
      setHasTips((userTips || []).length > 0);

      // Check if user has been tipped
      const { data: receivedTips, error: receivedError } = await supabase
        .from('tips')
        .select('id')
        .eq('tipped_user_id', userId)
        .limit(1);

      if (receivedError) throw receivedError;
      setHasBeenTipped((receivedTips || []).length > 0);
    } catch (error) {
      console.error('Error checking tip status:', error);
      setHasTips(false);
      setHasBeenTipped(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-white">Loading...</div>;
  }

  return <>{children(hasTips, hasBeenTipped)}</>;
};

export default TipStatusChecker;