import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, User, Crown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

interface DimeProfile {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  profile_photo: string;
  user_type: string;
  gender: string;
  bio: string;
  city: string;
  state: string;
}

const DimesDirectory: React.FC = () => {
  const [profiles, setProfiles] = useState<DimeProfile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<DimeProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    filterProfiles();
  }, [searchTerm, profiles]);

  const fetchProfiles = async () => {
    try {
      // First, let's see what user_types exist in the database
      const { data, error } = await supabase
        .from('users')
        .select('id, username, first_name, last_name, profile_photo, user_type, gender, bio, city, state')
        .not('user_type', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Include all female users that are part of the platform: normal, stripper, or exotic
      const femaleUsers = (data?.filter(user => 
        (String(user.gender || '').toLowerCase() === 'female') &&
        ['normal', 'stripper', 'exotic'].includes(String(user.user_type || '').toLowerCase())
      ) || []).map(user => ({
        id: user.id as string,
        username: user.username as string,
        first_name: user.first_name as string,
        last_name: user.last_name as string,
        profile_photo: user.profile_photo as string,
        user_type: user.user_type as string,
        gender: user.gender as string,
        bio: user.bio as string,
        city: user.city as string || '',
        state: user.state as string || ''
      }));
      setProfiles(femaleUsers);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProfiles = () => {
    if (!searchTerm.trim()) {
      setFilteredProfiles(profiles);
      return;
    }

    const filtered = profiles.filter(profile =>
      profile.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.state.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredProfiles(filtered);
  };

  const handleProfileClick = (username: string) => {
    navigate(`/profile/${username}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading profiles...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Browse Dimes</h2>
        <p className="text-gray-600 mb-6">Search and discover dimes profiles</p>
        
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search by username or city or state..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Results Count */}
      <div className="text-center text-gray-600">
        {filteredProfiles.length} profile{filteredProfiles.length !== 1 ? 's' : ''} found
      </div>

      {/* Profiles Grid */}
      {filteredProfiles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProfiles.map((profile) => (
            <Card 
              key={profile.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
              onClick={() => handleProfileClick(profile.username)}
            >
              <CardContent className="p-4">
                <div className="text-center">
                  {/* Profile Picture */}
                  <div className="w-20 h-20 mx-auto mb-3 rounded-full overflow-hidden bg-gray-200">
                    <img 
                      src={profile.profile_photo || '/placeholder.svg'} 
                      alt={profile.username}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Username & Location */}
                  <h3 className="font-semibold text-lg mb-1">
                    @{profile.username}
                  </h3>
                  <p className="text-gray-600 mb-2">
                    {profile.city && profile.state ? `${profile.city}, ${profile.state}` : 
                     profile.city ? profile.city : 
                     profile.state ? profile.state : 
                     'Location not specified'}
                  </p>

                  {/* Badges */}
                  <div className="flex justify-center gap-2 mb-3">
                    <Badge variant="secondary" className="text-xs">
                      {profile.gender}
                    </Badge>
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <Crown className="w-3 h-3" />
                      {profile.user_type?.charAt(0).toUpperCase() + profile.user_type?.slice(1)}
                    </Badge>
                  </div>

                  {/* Bio Preview */}
                  {profile.bio && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {profile.bio}
                    </p>
                  )}

                  {/* View Profile Button */}
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProfileClick(profile.username);
                    }}
                  >
                    <User className="w-4 h-4 mr-2" />
                    View Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No profiles found</h3>
          <p className="text-gray-600">
            {searchTerm ? 'Try adjusting your search terms' : 'No dimes profiles available'}
          </p>
        </div>
      )}
    </div>
  );
};

export default DimesDirectory;
