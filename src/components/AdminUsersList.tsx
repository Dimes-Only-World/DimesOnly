import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import AdminUserFiltersEnhanced from './AdminUserFiltersEnhanced';
import AdminUserDetailsEnhanced from './AdminUserDetailsEnhanced';

interface User {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  city?: string;
  state?: string;
  user_type: string;
  profile_photo?: string;
  status?: string;
  created_at: string;
  gender?: string;
}

const AdminUsersList = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Filter states
  const [userTypeFilter, setUserTypeFilter] = useState('all');
  const [usernameFilter, setUsernameFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, userTypeFilter, usernameFilter, cityFilter, stateFilter, genderFilter]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    // Filter by user type
    if (userTypeFilter !== 'all') {
      filtered = filtered.filter(user => {
        if (userTypeFilter === 'female') {
          return user.user_type === 'normal' || user.user_type === 'female';
        }
        return user.user_type === userTypeFilter;
      });
    }

    // Filter by gender
    if (genderFilter !== 'all') {
      filtered = filtered.filter(user => {
        const userGender = getUserGender(user.user_type);
        return userGender.toLowerCase() === genderFilter.toLowerCase();
      });
    }

    // Filter by username
    if (usernameFilter) {
      filtered = filtered.filter(user => 
        user.username.toLowerCase().includes(usernameFilter.toLowerCase())
      );
    }

    // Filter by city
    if (cityFilter) {
      filtered = filtered.filter(user => 
        user.city?.toLowerCase().includes(cityFilter.toLowerCase())
      );
    }

    // Filter by state
    if (stateFilter) {
      filtered = filtered.filter(user => 
        user.state?.toLowerCase().includes(stateFilter.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  };

  const getUserGender = (userType: string) => {
    if (userType === 'male') return 'Male';
    return 'Female'; // Default for normal, female, stripper, exotic
  };

  const getUserTypeDisplay = (userType: string) => {
    if (userType === 'normal' || userType === 'female') return 'Female';
    return userType.charAt(0).toUpperCase() + userType.slice(1);
  };

  const handleShowDetails = (user: User) => {
    setSelectedUser(user);
    setShowDetails(true);
  };

  const handleUserUpdated = () => {
    fetchUsers();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading users...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>All User Profiles ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminUserFiltersEnhanced
            userTypeFilter={userTypeFilter}
            setUserTypeFilter={setUserTypeFilter}
            usernameFilter={usernameFilter}
            setUsernameFilter={setUsernameFilter}
            cityFilter={cityFilter}
            setCityFilter={setCityFilter}
            stateFilter={stateFilter}
            setStateFilter={setStateFilter}
            genderFilter={genderFilter}
            setGenderFilter={setGenderFilter}
          />
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {filteredUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={user.profile_photo} alt={user.username} />
                    <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <h3 className="font-semibold">{user.username}</h3>
                    <p className="text-sm text-gray-600">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user.phone} • {user.city}, {user.state}
                    </p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline">{getUserTypeDisplay(user.user_type)}</Badge>
                      <Badge variant="secondary">{getUserGender(user.user_type)}</Badge>
                      {user.status && (
                        <Badge 
                          variant={user.status === 'active' ? 'default' : 'destructive'}
                        >
                          {user.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end space-y-2">
                  <p className="text-sm text-gray-600">
                    Joined: {new Date(user.created_at).toLocaleDateString()}
                  </p>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShowDetails(user)}
                    >
                      Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredUsers.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No users found matching your filters.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <AdminUserDetailsEnhanced
        user={selectedUser}
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        onUserUpdated={handleUserUpdated}
      />
    </>
  );
};

export default AdminUsersList;