import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface MediaLikesProps {
  mediaId: string;
  currentUserId: string;
  initialLikes?: number;
  initialLiked?: boolean;
}

const MediaLikes: React.FC<MediaLikesProps> = ({
  mediaId,
  currentUserId,
  initialLikes = 0,
  initialLiked = false
}) => {
  const [likes, setLikes] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [loading, setLoading] = useState(false);
  const [showLikers, setShowLikers] = useState(false);
  const [likers, setLikers] = useState<Array<{ username: string; profile_photo: string }>>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchLikes();
  }, [mediaId]);

  const fetchLikes = async () => {
    try {
      // Get total likes count
      const { data: likesData, error: likesError } = await supabase
        .from('media_likes')
        .select('user_id')
        .eq('media_id', mediaId);

      if (likesError) throw likesError;

      setLikes(likesData?.length || 0);

      // Check if current user has liked
      if (currentUserId) {
        const userLiked = likesData?.some(like => like.user_id === currentUserId) || false;
        setIsLiked(userLiked);
      }
    } catch (error) {
      console.error('Error fetching likes:', error);
    }
  };

  const fetchLikers = async () => {
    try {
      const { data, error } = await supabase
        .from('media_likes')
        .select(`
          user:users(username, profile_photo)
        `)
        .eq('media_id', mediaId)
        .limit(10);

      if (error) throw error;

      const likersList = data
        .map(item => item.user)
        .filter(Boolean) as Array<{ username: string; profile_photo: string }>;

      setLikers(likersList);
    } catch (error) {
      console.error('Error fetching likers:', error);
    }
  };

  const handleLike = async () => {
    if (!currentUserId) {
      toast({
        title: 'Login Required',
        description: 'Please log in to like content',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('media_likes')
          .delete()
          .eq('media_id', mediaId)
          .eq('user_id', currentUserId);

        if (error) throw error;

        setLikes(prev => prev - 1);
        setIsLiked(false);
        
        toast({
          title: 'Unliked',
          description: 'Content unliked successfully'
        });
      } else {
        // Like
        const { error } = await supabase
          .from('media_likes')
          .insert({
            media_id: mediaId,
            user_id: currentUserId,
            created_at: new Date().toISOString()
          });

        if (error) throw error;

        setLikes(prev => prev + 1);
        setIsLiked(true);
        
        toast({
          title: 'Liked!',
          description: 'Content liked successfully'
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: 'Error',
        description: 'Failed to update like',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShowLikers = () => {
    if (!showLikers && likes > 0) {
      fetchLikers();
    }
    setShowLikers(!showLikers);
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLike}
        disabled={loading}
        className={`flex items-center gap-2 transition-all duration-200 ${
          isLiked 
            ? 'text-red-500 hover:text-red-600 hover:bg-red-50' 
            : 'text-gray-500 hover:text-gray-600 hover:bg-gray-50'
        }`}
      >
        <Heart 
          className={`w-5 h-5 transition-all duration-200 ${
            isLiked ? 'fill-current' : ''
          }`} 
        />
        <span className="font-medium">{likes}</span>
      </Button>

      {likes > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleShowLikers}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-600 hover:bg-gray-50"
        >
          <Users className="w-4 h-4" />
          <span className="text-sm">View</span>
        </Button>
      )}

      {/* Likers Modal */}
      {showLikers && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">People who liked this</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLikers(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </Button>
            </div>
            
            {likers.length > 0 ? (
              <div className="space-y-3">
                {likers.map((liker, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
                      {liker.profile_photo ? (
                        <img 
                          src={liker.profile_photo} 
                          alt={liker.username}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        liker.username.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="font-medium text-gray-900">{liker.username}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                No likers found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaLikes;
