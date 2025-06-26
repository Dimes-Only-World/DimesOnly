import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Search } from 'lucide-react';

interface User {
  id: string;
  username: string;
}

interface EarningsData {
  weeklyEarnings: Array<{ week: string; amount: number }>;
  currentEarnings: number;
  jackpotTickets: number;
  winningTickets: Array<{ date: string; amount: number }>;
  totalEarnings: number;
}

const AdminEarningsTab: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(user => 
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username')
        .order('username');

      if (error) throw error;
      setUsers(data || []);
      setFilteredUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchUserEarnings = async (userId: string) => {
    setLoading(true);
    try {
      // Fetch tips for earnings
      const { data: tips, error: tipsError } = await supabase
        .from('tips')
        .select('amount, created_at')
        .eq('recipient_id', userId);

      if (tipsError) throw tipsError;

      // Calculate weekly earnings
      const weeklyEarnings = calculateWeeklyEarnings(tips || []);
      const currentEarnings = (tips || []).reduce((sum, tip) => sum + tip.amount, 0);

      // Mock data for jackpot and winnings (replace with actual queries)
      const mockEarnings: EarningsData = {
        weeklyEarnings,
        currentEarnings,
        jackpotTickets: Math.floor(Math.random() * 50),
        winningTickets: [],
        totalEarnings: currentEarnings
      };

      setEarnings(mockEarnings);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch earnings data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateWeeklyEarnings = (tips: any[]) => {
    const weeklyData: { [key: string]: number } = {};
    
    tips.forEach(tip => {
      const date = new Date(tip.created_at);
      const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
      const weekKey = weekStart.toISOString().split('T')[0];
      
      weeklyData[weekKey] = (weeklyData[weekKey] || 0) + tip.amount;
    });

    return Object.entries(weeklyData).map(([week, amount]) => ({ week, amount }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search a user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedUser} onValueChange={(value) => {
              setSelectedUser(value);
              if (value) fetchUserEarnings(value);
            }}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {filteredUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading && (
            <div className="text-center py-8">Loading earnings data...</div>
          )}

          {earnings && !loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Current Earnings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${earnings.currentEarnings.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Not withdrawn</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Jackpot Tickets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{earnings.jackpotTickets}</div>
                  <p className="text-xs text-muted-foreground">Current tickets</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Winning Tickets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{earnings.winningTickets.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {earnings.winningTickets.length === 0 ? 'No winnings yet!' : 'Total wins'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Earnings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${earnings.totalEarnings.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">All time</p>
                </CardContent>
              </Card>
            </div>
          )}

          {earnings && earnings.weeklyEarnings.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Weekly Earnings History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {earnings.weeklyEarnings.map((week, index) => (
                    <div key={index} className="flex justify-between items-center p-2 border rounded">
                      <span className="text-sm">Week of {week.week}</span>
                      <Badge variant="outline">${week.amount.toFixed(2)}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminEarningsTab;