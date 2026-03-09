import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getRatingSeasonYear } from '@/lib/timeUtils';

interface RankedUser {
  id: string;
  username: string;
  profile_photo?: string;
  user_type: string;
  total_score: number;
  rating_count: number;
  rank: number;
}

type FilterType = 'all' | 'stripper' | 'exotic';

const AdminRankingTab: React.FC = () => {
  const [rankedUsers, setRankedUsers] = useState<RankedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchRankings();
  }, []);

  const fetchRankings = async () => {
    try {
      // Year scope to match public page
      const seasonYear = getRatingSeasonYear();

      // Fetch users from public_user_profiles (bypasses RLS)
      const { data: users, error: usersError } = await supabase
        .from('public_user_profiles')
        .select(`
          id,
          username,
          profile_photo,
          user_type
        `)
        .in('user_type', ['stripper', 'exotic']);

      if (usersError) throw usersError;

      // Fetch ratings for these users in current year
      const userIds = users?.map(u => u.id) || [];
      
      if (userIds.length === 0) {
        setRankedUsers([]);
        setLoading(false);
        return;
      }

      const { data: ratings, error: ratingsError } = await supabase
        .from('ratings')
        .select('user_id, rating, year')
        .in('user_id', userIds)
        .eq('year', seasonYear);

      if (ratingsError) throw ratingsError;

      // Aggregate total scores and counts per user (match public Rankings.tsx)
      const userScores: { [key: string]: { total_score: number; rating_count: number } } = {};
      ratings?.forEach(r => {
        const uid = String(r.user_id);
        if (!userScores[uid]) userScores[uid] = { total_score: 0, rating_count: 0 };
        userScores[uid].total_score += Number(r.rating);
        userScores[uid].rating_count += 1;
      });

      // Create ranked list - include all users even without ratings
      const rankedList: RankedUser[] = (users || []).map(user => {
        const agg = userScores[user.id] || { total_score: 0, rating_count: 0 };
        return {
          id: user.id,
          username: user.username,
          profile_photo: user.profile_photo,
          user_type: user.user_type,
          total_score: agg.total_score,
          rating_count: agg.rating_count,
          rank: 0,
        } as RankedUser;
      });

      // Sort by total_score (highest first) and assign ranks
      rankedList.sort((a, b) => b.total_score - a.total_score);
      rankedList.forEach((user, index) => {
        user.rank = index + 1;
      });

      // Take top 50
      setRankedUsers(rankedList.slice(0, 50));
    } catch (error) {
      console.error("[AdminRankingTab] fetch error:", error);
      toast({
        title: 'Error',
        description: 'Failed to fetch rankings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetRankings = async () => {
    if (isResetting) return;

    const seasonYear = getRatingSeasonYear();
    const confirmed = window.confirm(
      `Reset all ranking points for season ${seasonYear}? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setIsResetting(true);

      const { error } = await supabase
        .from("ratings")
        .delete()
        .eq("year", seasonYear);

      if (error) throw error;

      toast({
        title: "Rankings reset",
        description: `All ranking points for ${seasonYear} have been cleared.`,
      });

      setLoading(true);
      await fetchRankings();
    } catch (error) {
      console.error("[AdminRankingTab] reset error:", error);
      toast({
        title: "Reset failed",
        description: "Could not reset rankings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  // Filter users based on selected filter
  const filteredUsers = filter === 'all' 
    ? rankedUsers 
    : rankedUsers.filter(u => u.user_type === filter);

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
      <CardHeader className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>User Rankings - Top 50 Strippers & Exotic Dancers</CardTitle>
            <p className="text-sm text-muted-foreground">
              Ranked by total score (Season {getRatingSeasonYear()})
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={handleResetRankings}
            disabled={isResetting || loading}
          >
            {isResetting ? "Resetting..." : "Reset Rankings"}
          </Button>
        </div>
        
        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="stripper">Strippers</TabsTrigger>
            <TabsTrigger value="exotic">Exotics</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredUsers.map((user, index) => (
            <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-bold">
                  #{filter === 'all' ? user.rank : index + 1}
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
                <div className="text-sm sm:text-lg font-bold">
                  {user.total_score.toLocaleString()} <span className="hidden sm:inline">Total Score</span><span className="sm:hidden">pts</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {user.rating_count} rating{user.rating_count !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          ))}
          
          {filteredUsers.length === 0 && (
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