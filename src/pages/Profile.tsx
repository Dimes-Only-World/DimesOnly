import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageCircle, DollarSign, Star, Lock, Crown } from 'lucide-react';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import MediaGrid from '@/components/MediaGrid';

interface UserProfile {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  bio: string;
  profile_photo: string;
  banner_photo: string;
  user_type: string;
  gender: string;
  city: string;
  state: string;
}

interface UserMedia {
  id: string;
  url: string;
  type: 'photo' | 'video';
  content_tier: string;
  flagged: boolean;
  created_at: string;
}

const Profile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAppContext();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [media, setMedia] = useState<UserMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'free' | 'silver' | 'gold'>('free');
  const [userMembership, setUserMembership] = useState<string>('free');

  useEffect(() => {
    if (username) {
      fetchProfile();
      fetchUserMembership();
    }
  }, [username]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, first_name, last_name, bio, profile_photo, banner_photo, user_type, gender, city, state')
        .eq('username', username)
        .single();

      if (error || !data) {
        toast({
          title: "Profile not found",
          description: "The requested profile does not exist.",
          variant: "destructive"
        });
        navigate('/dashboard');
        return;
      }

      setProfile(data as UserProfile);
      await fetchMedia(data.id);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMedia = async (userId: string) => {
    try {
      // Use supabaseAdmin like the admin dashboard does to bypass RLS
      const { data, error } = await supabaseAdmin
        .from('user_media')
        .select('id, media_url, media_type, content_tier, flagged, created_at')
        .eq('user_id', userId)
        .eq('flagged', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('Profile media fetched:', data); // Debug log

      const transformedMedia = (data || []).map(item => ({
        id: item.id,
        url: item.media_url,
        type: item.media_type as 'photo' | 'video',
        content_tier: item.content_tier,
        flagged: item.flagged,
        created_at: item.created_at
      }));

      console.log('Transformed media:', transformedMedia); // Debug log
      setMedia(transformedMedia);
    } catch (error) {
      console.error('Error fetching media:', error);
    }
  };

  const fetchUserMembership = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('membership_upgrades')
        .select('membership_type, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setUserMembership(data[0].membership_type);
      } else {
        // Ensure default is 'free' if no active membership found
        setUserMembership('free');
      }
    } catch (error) {
      console.error('Error fetching membership:', error);
      setUserMembership('free'); // Default to free on error
    }
  };

  const getFilteredMedia = () => {
    const filtered = media.filter(item => {
      if (activeTab === 'free') return item.content_tier === 'free';
      if (activeTab === 'silver') return item.content_tier === 'silver';
      if (activeTab === 'gold') return item.content_tier === 'gold';
      return false;
    });

    // Transform media URLs to include proper Supabase storage URLs
    return filtered.map(item => ({
      ...item,
      media_url: item.url.startsWith('http') ? item.url : `https://qkcuykpndrolrewwnkwb.supabase.co/storage/v1/object/public/media/${item.url}`,
      url: item.url.startsWith('http') ? item.url : `https://qkcuykpndrolrewwnkwb.supabase.co/storage/v1/object/public/media/${item.url}`
    }));
  };

  const canAccessTier = (tier: string) => {
    if (tier === 'free') return true;
    if (tier === 'silver') return ['silver_plus', 'diamond_plus'].includes(userMembership);
    if (tier === 'gold') return userMembership === 'diamond_plus';
    return false;
  };

  const handleTip = () => {
    navigate(`/tip?tip=${username}`);
  };

  const handleRate = () => {
    navigate(`/rate?rate=${username}`);
  };

  const handleUpgrade = (tier: string) => {
    if (tier === 'silver') {
      navigate('/upgrade-silver-plus');
    } else if (tier === 'gold') {
      navigate('/upgrade-diamond');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Profile not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Banner Section */}
        <Card className="mb-6 overflow-hidden">
          <div className="relative h-64 bg-gradient-to-r from-purple-600 to-blue-600">
            {profile.banner_photo && (
              <img 
                src={profile.banner_photo} 
                alt="Banner" 
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-black bg-opacity-30" />
            
            {/* Profile Picture & Info */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="flex items-end gap-6">
                <div className="w-32 h-32 rounded-full border-4 border-white overflow-hidden bg-white">
                  <img 
                    src={profile.profile_photo || '/placeholder.svg'} 
                    alt={profile.username}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="flex-1 text-white">
                  <h1 className="text-3xl font-bold">@{profile.username}</h1>
                  <p className="text-xl opacity-90">
                    {profile.city && profile.state ? `${profile.city}, ${profile.state}` : 
                     profile.city ? profile.city : 
                     profile.state ? profile.state : 
                     'Location not specified'}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      {profile.gender}
                    </Badge>
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      {profile.user_type}
                    </Badge>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button onClick={handleTip} className="bg-green-600 hover:bg-green-700">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Tip
                  </Button>
                  <Button onClick={handleRate} className="bg-yellow-600 hover:bg-yellow-700">
                    <Star className="w-4 h-4 mr-2" />
                    Rate
                  </Button>
                </div>
              </div>
              
              {profile.bio && (
                <div className="mt-4 text-white/90">
                  <p>{profile.bio}</p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Content Tiers */}
        <Card>
          <CardContent className="p-6">
            {/* Tier Tabs */}
            <div className="flex gap-2 mb-6">
              <Button
                variant={activeTab === 'free' ? 'default' : 'outline'}
                onClick={() => setActiveTab('free')}
                className="flex items-center gap-2"
              >
                Free Content
              </Button>
              
              <Button
                variant={activeTab === 'silver' ? 'default' : 'outline'}
                onClick={() => setActiveTab('silver')}
                className="flex items-center gap-2"
                disabled={!canAccessTier('silver')}
              >
                <Crown className="w-4 h-4" />
                Silver Content
                {!canAccessTier('silver') && <Lock className="w-4 h-4" />}
              </Button>
              
              <Button
                variant={activeTab === 'gold' ? 'default' : 'outline'}
                onClick={() => setActiveTab('gold')}
                className="flex items-center gap-2"
                disabled={!canAccessTier('gold')}
              >
                <Crown className="w-4 h-4 text-yellow-500" />
                Gold Content
                {!canAccessTier('gold') && <Lock className="w-4 h-4" />}
              </Button>
            </div>

            {/* Content Display */}
            {canAccessTier(activeTab) ? (
              <div>
                {getFilteredMedia().length > 0 ? (
                  <MediaGrid 
                    media={getFilteredMedia()}
                    currentUserId={user?.id || ''}
                    showLikesAndComments={true}
                  />
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <p>No {activeTab} content available</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Lock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  {activeTab === 'silver' ? 'Silver Plus' : 'Diamond Plus'} Required
                </h3>
                <p className="text-gray-600 mb-4">
                  Upgrade your membership to access this exclusive content
                </p>
                <Button 
                  onClick={() => handleUpgrade(activeTab)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Upgrade to {activeTab === 'silver' ? 'Silver Plus' : 'Diamond Plus'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
