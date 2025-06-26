import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface RatingStatusCheckerProps {
  userId: string;
  children: (hasRatings: boolean, hasBeenRated: boolean) => React.ReactNode;
}

const RatingStatusChecker: React.FC<RatingStatusCheckerProps> = ({ userId, children }) => {
  const [hasRatings, setHasRatings] = useState(false);
  const [hasBeenRated, setHasBeenRated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkRatingStatus();
  }, [userId]);

  const checkRatingStatus = async () => {
    try {
      setLoading(true);
      
      // Check if user has made any ratings
      const { data: userRatings, error: ratingsError } = await supabase
        .from('ratings')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (ratingsError) throw ratingsError;
      setHasRatings((userRatings || []).length > 0);

      // Check if user has been rated
      const { data: receivedRatings, error: receivedError } = await supabase
        .from('ratings')
        .select('id')
        .eq('rated_user_id', userId)
        .limit(1);

      if (receivedError) throw receivedError;
      setHasBeenRated((receivedRatings || []).length > 0);
    } catch (error) {
      console.error('Error checking rating status:', error);
      setHasRatings(false);
      setHasBeenRated(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-white">Loading...</div>;
  }

  return <>{children(hasRatings, hasBeenRated)}</>;
};

export default RatingStatusChecker;