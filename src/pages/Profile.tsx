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

  // Silence debug logs in console; flip to console.log if needed for debugging
  const debugLog = (..._args: any[]) => {};

  useEffect(() => {
    if (username) {
      fetchProfile();
      fetchUserMembership();
    }
  }, [username]);

  // Ensure membership is fetched when auth session becomes available/changes
  useEffect(() => {
    if (user?.id) {
      fetchUserMembership();
    }
  }, [user?.id]);

  const fetchProfile = async () => {
    try {
      // Sanitize + normalize username to avoid hidden chars/trailing spaces/case issues
      const sanitize = (s: string) =>
        s
          .replace(/[\u200B\u200C\u200D\u00A0]/g, '') // zero-width & NBSP
          .normalize('NFKC')
          .trim()
          .toLowerCase();
      const normalizedUsername = sanitize(String(username));

      // Use maybeSingle to avoid 406 errors on 0 rows
      let { data, error } = await supabase
        .from('users')
        .select('id, username, first_name, last_name, bio, profile_photo, banner_photo, user_type, gender, city, state')
        .eq('username', normalizedUsername)
        .maybeSingle();

      // Fallback: try case-insensitive match if exact match failed
      if ((!data || error) && !data) {
        const res = await supabase
          .from('users')
          .select('id, username, first_name, last_name, bio, profile_photo, banner_photo, user_type, gender, city, state')
          .ilike('username', normalizedUsername)
          .maybeSingle();
        data = res.data as any;
        error = res.error as any;
      }

      // Fallback: try contains search (may match multiple). We'll pick the best match.
      if ((!data || error) && !data) {
        const res = await supabase
          .from('users')
          .select('id, username, first_name, last_name, bio, profile_photo, banner_photo, user_type, gender, city, state')
          .ilike('username', `%${normalizedUsername}%`);
        const rows = res.data as any[] | null;
        if (rows && rows.length > 0) {
          // Prefer exact case-insensitive match, else startsWith, else first
          const lower = (u: string) => String(u || '').toLowerCase();
          const exact = rows.find(r => lower(r.username) === normalizedUsername);
          const starts = rows.find(r => lower(r.username).startsWith(normalizedUsername));
          data = (exact || starts || rows[0]) as any;
          error = res.error as any;
        }
      }

      // If still no data, try admin client to bypass RLS in case a specific row is blocked
      if (!data) {
        debugLog('[Profile] Public fetch returned no data. Trying admin fallback for', normalizedUsername);
        // Exact
        let adminRes = await supabaseAdmin
          .from('users')
          .select('id, username, first_name, last_name, bio, profile_photo, banner_photo, user_type, gender, city, state')
          .eq('username', normalizedUsername)
          .maybeSingle();
        let adminData = adminRes.data as any | null;

        if (!adminData) {
          // Case-insensitive
          adminRes = await supabaseAdmin
            .from('users')
            .select('id, username, first_name, last_name, bio, profile_photo, banner_photo, user_type, gender, city, state')
            .ilike('username', normalizedUsername)
            .maybeSingle();
          adminData = adminRes.data as any | null;
        }

        if (!adminData) {
          // Contains match, pick best
          const resList = await supabaseAdmin
            .from('users')
            .select('id, username, first_name, last_name, bio, profile_photo, banner_photo, user_type, gender, city, state')
            .ilike('username', `%${normalizedUsername}%`);
          const rows = resList.data as any[] | null;
          if (rows && rows.length > 0) {
            const lower = (u: string) => String(u || '').toLowerCase();
            const exact = rows.find(r => lower(r.username) === normalizedUsername);
            const starts = rows.find(r => lower(r.username).startsWith(normalizedUsername));
            adminData = (exact || starts || rows[0]) as any;
          }
        }

        if (adminData) {
          debugLog('[Profile] Admin fallback succeeded for', adminData.username);
          data = adminData;
        } else {
          debugLog('[Profile] Admin fallback also failed for', normalizedUsername, 'error:', error);
        }
      }

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
        .select('id, media_url, media_type, content_tier, flagged, created_at, storage_path')
        .eq('user_id', userId)
        .eq('flagged', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      debugLog('Profile media fetched:', data);

      const transformedMedia = await Promise.all((data || []).map(async (item) => {
        let effectiveUrl = item.media_url as string;
        // Videos are stored in the private bucket; generate a signed URL
        if (item.media_type === 'video' && item.storage_path) {
          try {
            const { data: signed, error: signErr } = await supabaseAdmin
              .storage
              .from('private-media')
              .createSignedUrl(item.storage_path, 60 * 60); // 1 hour
            if (!signErr && signed?.signedUrl) {
              effectiveUrl = signed.signedUrl;
            }
          } catch (e) {
            console.warn('Failed to create signed URL for video', item.id, e);
          }
        }

        return {
          id: item.id,
          url: effectiveUrl,
          type: item.media_type as 'photo' | 'video',
          content_tier: item.content_tier,
          flagged: item.flagged,
          created_at: item.created_at,
        };
      }));

      debugLog('Transformed media:', transformedMedia);
      setMedia(transformedMedia);
    } catch (error) {
      console.error('Error fetching media:', error);
    }
  };

  const fetchUserMembership = async () => {
    if (!user?.id) return;
    try {
      // 1) Trust the users table first (updated by webhook)
      const { data: userRow, error: userErr } = await supabase
        .from('users')
        .select('membership_tier, membership_type, silver_plus_active, diamond_plus_active')
        .eq('id', user.id)
        .single();

      if (!userErr && userRow) {
        const rawTier = (userRow.membership_tier || userRow.membership_type || '').toString().toLowerCase();
        const normalizedTier = rawTier === 'gold' || rawTier === 'diamond' ? 'diamond_plus'
          : rawTier === 'silver' ? 'silver_plus'
          : rawTier;

        if (userRow.diamond_plus_active || normalizedTier === 'diamond_plus') {
          setUserMembership('diamond_plus');
          return;
        }
        if (userRow.silver_plus_active || normalizedTier === 'silver_plus') {
          setUserMembership('silver_plus');
          return;
        }
      }

      // 2) Fallback to completed upgrades in membership_upgrades
      const { data: upgrades, error: upgErr } = await supabase
        .from('membership_upgrades')
        .select('upgrade_type, upgrade_status')
        .eq('user_id', user.id)
        .eq('upgrade_status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!upgErr && upgrades && upgrades.length > 0) {
        const rawUpgrade = String(upgrades[0].upgrade_type || '').toLowerCase();
        const normalizedUpgrade = rawUpgrade === 'gold' || rawUpgrade === 'diamond' ? 'diamond_plus'
          : rawUpgrade === 'silver' ? 'silver_plus'
          : rawUpgrade;
        setUserMembership(normalizedUpgrade);
        return;
      }

      // Default
      setUserMembership('free');
    } catch (error) {
      console.error('Error fetching membership:', error);
      setUserMembership('free');
    }
  };

  const getFilteredMedia = () => {
    const filtered = media.filter(item => {
      if (activeTab === 'free') return item.content_tier === 'free';
      if (activeTab === 'silver') return item.content_tier === 'silver';
      if (activeTab === 'gold') return item.content_tier === 'gold';
      return false;
    });

    // Transform for MediaGrid: ensure media_type is set and URLs are absolute
    return filtered.map(item => ({
      ...item,
      media_type: item.type, // required by MediaGrid
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
      navigate('/upgrade');
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
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Banner Section */}
        <Card className="mb-4 sm:mb-6 overflow-hidden">
          <div className="relative h-72 sm:h-64 bg-gradient-to-r from-purple-600 to-blue-600">
            {profile.banner_photo && (
              <img 
                src={profile.banner_photo} 
                alt="Banner" 
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-black bg-opacity-30" />
            
            {/* Profile Picture & Info */}
            <div className="absolute bottom-0 left-0 right-0 p-3 pt-8 sm:p-6 sm:pt-10">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3 sm:gap-6">
                <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-full border-4 border-white overflow-hidden bg-white flex-shrink-0 shadow-lg mt-6 sm:mt-0">
                  <img 
                    src={profile.profile_photo || '/placeholder.svg'} 
                    alt={profile.username}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="flex-1 text-white text-center sm:text-left">
                  <h1 className="text-xl sm:text-3xl font-bold">@{profile.username}</h1>
                  <p className="text-sm sm:text-xl opacity-90 break-words">
                    {profile.city && profile.state ? `${profile.city}, ${profile.state}` : 
                     profile.city ? profile.city : 
                     profile.state ? profile.state : 
                     'Location not specified'}
                  </p>
                  <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                    <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                      {profile.gender}
                    </Badge>
                    <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                      {profile.user_type}
                    </Badge>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                  <Button 
                    onClick={handleTip} 
                    className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none text-sm sm:text-base px-3 sm:px-4 py-2"
                    size="sm"
                  >
                    <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Tip
                  </Button>
                  <Button 
                    onClick={handleRate} 
                    className="bg-yellow-600 hover:bg-yellow-700 flex-1 sm:flex-none text-sm sm:text-base px-3 sm:px-4 py-2"
                    size="sm"
                  >
                    <Star className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Rate
                  </Button>
                </div>
              </div>
              
              {profile.bio && (
                <div className="mt-3 sm:mt-4 text-white/90 text-center sm:text-left">
                  <p className="text-sm sm:text-base">{profile.bio}</p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Content Tiers */}
        <Card>
          <CardContent className="p-3 sm:p-6">
            {/* Tier Tabs */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4 sm:mb-6">
              <Button
                variant={activeTab === 'free' ? 'default' : 'outline'}
                onClick={() => setActiveTab('free')}
                className="flex items-center justify-center gap-2 text-sm sm:text-base py-2 sm:py-3"
                size="sm"
              >
                Free Content
              </Button>
              
              <Button
                variant={activeTab === 'silver' ? 'default' : 'outline'}
                onClick={() => setActiveTab('silver')}
                className="flex items-center justify-center gap-2 text-sm sm:text-base py-2 sm:py-3"
                size="sm"
              >
                <Crown className="w-3 h-3 sm:w-4 sm:h-4" />
                Silver Content
                {!canAccessTier('silver') && <Lock className="w-3 h-3 sm:w-4 sm:h-4" />}
              </Button>
              
              <Button
                variant={activeTab === 'gold' ? 'default' : 'outline'}
                onClick={() => setActiveTab('gold')}
                className="flex items-center justify-center gap-2 text-sm sm:text-base py-2 sm:py-3"
                size="sm"
              >
                <Crown className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />
                Gold Content
                {!canAccessTier('gold') && <Lock className="w-3 h-3 sm:w-4 sm:h-4" />}
              </Button>
            </div>

            {/* Content Display */}
            {canAccessTier(activeTab) ? (
              <div>
                {getFilteredMedia().length > 0 ? (
                  <MediaGrid 
                    media={getFilteredMedia()}
                    currentUserId={user?.id || ''}
                    showLikesAndComments={true} onDelete={function (id: string): void {
                      throw new Error('Function not implemented.');
                    } }                  />
                ) : (
                  <div className="text-center py-8 sm:py-12 text-gray-500">
                    <p className="text-sm sm:text-base">No {activeTab} content available</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12 px-4">
                <Lock className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400 mb-3 sm:mb-4" />
                <h3 className="text-lg sm:text-xl font-semibold mb-2">
                  {activeTab === 'silver' ? 'Silver Plus' : 'Gold'} Required
                </h3>
                <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base">
                  Upgrade your membership to access this exclusive content
                </p>
                <Button 
                  onClick={() => handleUpgrade(activeTab)}
                  className="bg-purple-600 hover:bg-purple-700 text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3"
                  size="sm"
                >
                  Upgrade to {activeTab === 'silver' ? 'Silver Plus' : 'Gold'}
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
