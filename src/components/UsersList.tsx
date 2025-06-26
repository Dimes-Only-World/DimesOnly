import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  username: string;
  profile_photo: string;
  city: string;
  state: string;
  user_type: string;
}

interface UsersListProps {
  searchName: string;
  searchCity: string;
  searchState: string;
  onUserSelect?: (user: User) => void;
  actionType: 'tip' | 'rate';
  noDataMessage: string;
}

const UsersList: React.FC<UsersListProps> = ({
  searchName,
  searchCity,
  searchState,
  onUserSelect,
  actionType,
  noDataMessage
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, username, profile_photo, city, state, user_type')
        .in('user_type', ['stripper', 'exotic'])
        .order('username');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const nameMatch = !searchName || user.username.toLowerCase().includes(searchName.toLowerCase());
    const cityMatch = !searchCity || (user.city && user.city.toLowerCase().includes(searchCity.toLowerCase()));
    const stateMatch = !searchState || (user.state && user.state.toLowerCase().includes(searchState.toLowerCase()));
    return nameMatch && cityMatch && stateMatch;
  });

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="bg-white/10 backdrop-blur border-white/20 animate-pulse">
            <CardContent className="p-4">
              <div className="w-full h-48 bg-gray-700 rounded-lg mb-4"></div>
              <div className="h-4 bg-gray-700 rounded mb-2"></div>
              <div className="h-3 bg-gray-700 rounded mb-4"></div>
              <div className="h-8 bg-gray-700 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (filteredUsers.length === 0) {
    return (
      <div className="text-center py-16">
        <Card className="bg-white/10 backdrop-blur border-white/20 max-w-md mx-auto">
          <CardContent className="p-8">
            <h3 className="text-2xl font-bold text-yellow-400 mb-4">
              {noDataMessage}
            </h3>
            <p className="text-white">
              {users.length === 0 
                ? "No dancers or exotics have joined yet. Be the first to discover amazing performers!"
                : "No profiles match your search criteria. Try adjusting your filters."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {filteredUsers.map((user) => (
        <Card key={user.id} className="bg-white/10 backdrop-blur border-white/20 hover:bg-white/20 transition-all duration-300">
          <CardContent className="p-4 text-center">
            <img
              src={user.profile_photo || 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=300&h=300&fit=crop'}
              alt={user.username}
              className="w-full h-48 object-cover rounded-lg mb-4"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=300&h=300&fit=crop';
              }}
            />
            <h3 className="text-white font-semibold mb-2">@{user.username}</h3>
            <p className="text-gray-300 text-sm mb-4 flex items-center justify-center gap-1">
              <MapPin size={12} />
              {user.city || 'Unknown'}, {user.state || 'Unknown'}
            </p>
            <Button
              onClick={() => onUserSelect?.(user)}
              className={`w-full font-semibold ${
                actionType === 'tip'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                  : 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600'
              } text-white`}
            >
              {actionType === 'tip' ? 'TIP NOW' : 'RATE'}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default UsersList;