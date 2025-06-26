import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Eye, UserX } from 'lucide-react';
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
  mobile_number?: string;
  city?: string;
  state?: string;
  user_type: string;
  gender?: string;
  profile_photo?: string;
  banner_photo?: string;
  front_page_photo?: string;
  created_at: string;
  is_active: boolean;
}

const AdminUsersListEnhanced: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Filter states
  const [userTypeFilter, setUserTypeFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [usernameFilter, setUsernameFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, userTypeFilter, genderFilter, usernameFilter, cityFilter, stateFilter]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    // User type filter
    if (userTypeFilter !== 'all') {
      filtered = filtered.filter(user => {
        const userType = user.user_type?.toLowerCase() || '';
        if (userTypeFilter === 'female') {
          return userType === 'female' || userType === 'normal' || userType === '';
        }
        return userType === userTypeFilter;
      });
    }

    // Gender filter
    if (genderFilter !== 'all') {
      filtered = filtered.filter(user => {
        const gender = user.gender?.toLowerCase() || '';
        const userType = user.user_type?.toLowerCase() || '';
        
        if (genderFilter === 'male') {
          return gender === 'male' || userType === 'male';
        } else if (genderFilter === 'female') {
          return gender === 'female' || userType === 'female' || userType === 'normal' || userType === 'stripper' || userType === 'exotic' || (!gender && !userType);
        }
        return true;
      });
    }

    // Username filter
    if (usernameFilter) {
      filtered = filtered.filter(user => 
        user.username?.toLowerCase().includes(usernameFilter.toLowerCase())
      );
    }

    // City filter
    if (cityFilter) {
      filtered = filtered.filter(user => 
        user.city?.toLowerCase().includes(cityFilter.toLowerCase())
      );
    }

    // State filter
    if (stateFilter) {
      filtered = filtered.filter(user => 
        user.state?.toLowerCase().includes(stateFilter.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  };

  const getGenderDisplay = (user: User) => {
    const gender = user.gender?.toLowerCase() || '';
    const userType = user.user_type?.toLowerCase() || '';
    
    if (gender === 'male' || userType === 'male') {
      return 'Male';
    } else if (gender === 'female' || userType === 'female' || userType === 'normal' || userType === 'stripper' || userType === 'exotic' || (!gender && !userType)) {
      return 'Female';
    }
    return 'Unknown';
  };

  const getUserTypeDisplay = (userType: string) => {
    switch (userType?.toLowerCase()) {
      case 'stripper': return 'Stripper';
      case 'exotic': return 'Exotic';
      case 'male': return 'Male';
      case 'female':
      case 'normal':
      case '': return 'Female';
      default: return userType || 'Female';
    }
  };

  const getUserTypeBadgeVariant = (userType: string) => {
    switch (userType?.toLowerCase()) {
      case 'stripper': return 'destructive';
      case 'exotic': return 'secondary';
      case 'male': return 'outline';
      default: return 'default';
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'User deactivated successfully',
      });

      fetchUsers();
    } catch (error) {
      console.error('Error deactivating user:', error);
      toast({
        title: 'Error',
        description: 'Failed to deactivate user',
        variant: 'destructive',
      });
    }
  };

  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setShowDetails(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminUserFiltersEnhanced
            userTypeFilter={userTypeFilter}
            setUserTypeFilter={setUserTypeFilter}
            genderFilter={genderFilter}
            setGenderFilter={setGenderFilter}
            usernameFilter={usernameFilter}
            setUsernameFilter={setUsernameFilter}
            cityFilter={cityFilter}
            setCityFilter={setCityFilter}
            stateFilter={stateFilter}
            setStateFilter={setStateFilter}
          />
          
          <div className="text-sm text-gray-600 mb-4">
            Showing {filteredUsers.length} of {users.length} users
          </div>

          <div className="grid gap-4">
            {filteredUsers.map((user) => (
              <Card key={user.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.profile_photo} />
                        <AvatarFallback>
                          {user.username?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{user.username}</h3>
                          <Badge variant={getUserTypeBadgeVariant(user.user_type)}>
                            {getUserTypeDisplay(user.user_type)}
                          </Badge>
                          <Badge variant="outline">
                            {getGenderDisplay(user)}
                          </Badge>
                          {!user.is_active && (
                            <Badge variant="destructive">Inactive</Badge>
                          )}
                        </div>
                        
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><strong>Name:</strong> {user.first_name} {user.last_name}</p>
                          <p><strong>Email:</strong> {user.email}</p>
                          <p><strong>Phone:</strong> {user.mobile_number || 'N/A'}</p>
                          <p><strong>Location:</strong> {user.city}, {user.state}</p>
                          <p><strong>Joined:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(user)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Details
                      </Button>
                      
                      {user.is_active && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeactivateUser(user.id)}
                        >
                          <UserX className="w-4 h-4 mr-1" />
                          Deactivate
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No users found matching the current filters</p>
            </div>
          )}
        </CardContent>
      </Card>

      <AdminUserDetailsEnhanced
        user={selectedUser}
        isOpen={showDetails}
        onClose={() => {
          setShowDetails(false);
          setSelectedUser(null);
        }}
      />
    </div>
  );
};

export default AdminUsersListEnhanced;