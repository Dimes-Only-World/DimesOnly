import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface RankedUser {
  id: string;
  username: string;
  profile_photo?: string;
  user_type: string;
  average_rating: number;
  total_ratings: number;
  rank: number;
}

const AdminRankingTab: React.FC = () => {
  const [rankedUsers, setRankedUsers] = useState<RankedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchRankings();
  }, []);

  const fetchRankings = async () => {
    try {
      // Fetch users with their ratings (stripper and exotic only)
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select(`
          id,
          username,
          profile_photo,
          user_type
        `)
        .in('user_type', ['stripper', 'exotic']);

      if (usersError) throw usersError;

      // Fetch ratings for these users
      const userIds = users?.map(u => u.id) || [];
      const { data: ratings, error: ratingsError } = await supabase
        .from('ratings')
        .select('user_id, rating')
        .in('user_id', userIds);

      if (ratingsError) throw ratingsError;

      // Calculate average ratings
      const userRatings: { [key: string]: { total: number; count: number } } = {};
      
      ratings?.forEach(rating => {
        if (!userRatings[rating.user_id]) {
          userRatings[rating.user_id] = { total: 0, count: 0 };
        }
        userRatings[rating.user_id].total += rating.rating;
        userRatings[rating.user_id].count += 1;
      });

      // Create ranked list
      const rankedList: RankedUser[] = users?.map(user => {
        const userRating = userRatings[user.id];
        const averageRating = userRating ? userRating.total / userRating.count : 0;
        
        return {
          ...user,
          average_rating: averageRating,
          total_ratings: userRating?.count || 0,
          rank: 0 // Will be set after sorting
        };
      }) || [];

      // Sort by average rating (highest first) and assign ranks
      rankedList.sort((a, b) => b.average_rating - a.average_rating);
      rankedList.forEach((user, index) => {
        user.rank = index + 1;
      });

      // Take top 50
      setRankedUsers(rankedList.slice(0, 50));
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch rankings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading rankings...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Rankings - Top 50 Strippers & Exotic Dancers</CardTitle>
        <p className="text-sm text-muted-foreground">
          Ranked by average rating (highest to lowest)
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {rankedUsers.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-bold">
                  #{user.rank}
                </div>
                
                <Avatar className="w-10 h-10">
                  <AvatarImage src={user.profile_photo} alt={user.username} />
                  <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                
                <div>
                  <h3 className="font-semibold">{user.username}</h3>
                  <Badge variant="outline" className="text-xs">
                    {user.user_type}
                  </Badge>
                </div>
              </div>
              
              <div className="text-right">
                {user.total_ratings > 0 ? (
                  <>
                    <div className="text-lg font-bold">
                      {user.average_rating.toFixed(1)}/5.0
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {user.total_ratings} rating{user.total_ratings !== 1 ? 's' : ''}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No ratings yet!
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {rankedUsers.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No ranked users found
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminRankingTab;