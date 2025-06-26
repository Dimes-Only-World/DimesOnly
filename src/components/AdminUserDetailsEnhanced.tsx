import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Play, Flag, X, UserX } from 'lucide-react';

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
  profile_photo?: string;
  banner_photo?: string;
  front_page_photo?: string;
  created_at: string;
  status?: string;
}

interface Media {
  id: string;
  url: string;
  type: 'photo' | 'video';
  flagged?: boolean;
  warning_message?: string;
  filename?: string;
}

interface AdminUserDetailsEnhancedProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated?: () => void;
}

const AdminUserDetailsEnhanced: React.FC<AdminUserDetailsEnhancedProps> = ({ 
  user, 
  isOpen, 
  onClose, 
  onUserUpdated 
}) => {
  const [media, setMedia] = useState<Media[]>([]);
  const [flagMessage, setFlagMessage] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user && isOpen) {
      fetchUserMedia();
    }
  }, [user, isOpen]);

  const fetchUserMedia = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_media')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMedia(data || []);
    } catch (error) {
      console.error('Error fetching media:', error);
    }
  };

  const handleFlagMedia = async (mediaId: string) => {
    if (!flagMessage.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a warning message',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('user_media')
        .update({ 
          flagged: true, 
          warning_message: flagMessage 
        })
        .eq('id', mediaId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Media flagged successfully',
      });
      
      setFlagMessage('');
      setSelectedMedia(null);
      fetchUserMedia();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to flag media',
        variant: 'destructive',
      });
    }
  };

  const handleDeactivateUser = async () => {
    if (!user || !confirm('Are you sure you want to deactivate this user?')) return;

    setDeactivating(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: 'deactivated' })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'User deactivated successfully',
      });
      
      if (onUserUpdated) onUserUpdated();
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to deactivate user',
        variant: 'destructive',
      });
    } finally {
      setDeactivating(false);
    }
  };

  const getUserTypeDisplay = (userType: string) => {
    switch (userType.toLowerCase()) {
      case 'stripper': return 'Stripper';
      case 'exotic': return 'Exotic';
      case 'male': return 'Male';
      case 'female':
      case 'normal': return 'Female';
      default: return userType;
    }
  };

  if (!user) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>User Details - {user.username}</DialogTitle>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeactivateUser}
                disabled={deactivating || user.status === 'deactivated'}
                className="flex items-center gap-2"
              >
                <UserX className="w-4 h-4" />
                {deactivating ? 'Deactivating...' : 
                 user.status === 'deactivated' ? 'Deactivated' : 'Deactivate User'}
              </Button>
            </div>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Profile Photo</h3>
                {user.profile_photo ? (
                  <img 
                    src={user.profile_photo} 
                    alt="Profile" 
                    className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80"
                    onClick={() => setExpandedImage(user.profile_photo!)}
                  />
                ) : (
                  <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-gray-500">No photo</span>
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Banner Photo</h3>
                {user.banner_photo ? (
                  <img 
                    src={user.banner_photo} 
                    alt="Banner" 
                    className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80"
                    onClick={() => setExpandedImage(user.banner_photo!)}
                  />
                ) : (
                  <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-gray-500">No banner</span>
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Front Page Photo</h3>
                {user.front_page_photo ? (
                  <img 
                    src={user.front_page_photo} 
                    alt="Front Page" 
                    className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80"
                    onClick={() => setExpandedImage(user.front_page_photo!)}
                  />
                ) : (
                  <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-gray-500">No photo</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">Profile Information</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Username:</strong> {user.username}</p>
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Name:</strong> {user.first_name} {user.last_name}</p>
                  <p><strong>Phone:</strong> {user.mobile_number || 'N/A'}</p>
                  <p><strong>Location:</strong> {user.city}, {user.state}</p>
                  <p><strong>Type:</strong> <Badge>{getUserTypeDisplay(user.user_type)}</Badge></p>
                  <p><strong>Status:</strong> 
                    <Badge 
                      variant={user.status === 'deactivated' ? 'destructive' : 'default'}
                      className="ml-2"
                    >
                      {user.status || 'Active'}
                    </Badge>
                  </p>
                  <p><strong>Joined:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Uploaded Media ({media.length})</h3>
              {media.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No media uploaded</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {media.map((item) => (
                    <div key={item.id} className="relative border rounded-lg overflow-hidden">
                      {item.type === 'photo' ? (
                        <img 
                          src={item.url} 
                          alt="User media" 
                          className="w-full h-32 object-cover cursor-pointer hover:opacity-80"
                          onClick={() => setExpandedImage(item.url)}
                        />
                      ) : (
                        <div className="relative">
                          <video 
                            src={item.url} 
                            className="w-full h-32 object-cover"
                            poster={item.url}
                          />
                          <Button
                            size="sm"
                            className="absolute inset-0 bg-black bg-opacity-50 hover:bg-opacity-70"
                            onClick={() => setPlayingVideo(item.url)}
                          >
                            <Play className="w-6 h-6 text-white" />
                          </Button>
                        </div>
                      )}
                      
                      {item.flagged && (
                        <Badge variant="destructive" className="absolute top-1 right-1 text-xs">
                          Flagged
                        </Badge>
                      )}
                      
                      <div className="p-2">
                        <Button
                          size="sm"
                          variant={selectedMedia === item.id ? "secondary" : "outline"}
                          onClick={() => setSelectedMedia(selectedMedia === item.id ? null : item.id)}
                          className="w-full mb-2"
                        >
                          <Flag className="w-3 h-3 mr-1" />
                          {item.flagged ? 'Flagged' : 'Flag'}
                        </Button>
                        
                        {selectedMedia === item.id && (
                          <div className="space-y-2">
                            <Textarea
                              placeholder="Warning message..."
                              value={flagMessage}
                              onChange={(e) => setFlagMessage(e.target.value)}
                              rows={2}
                              className="text-xs"
                            />
                            <Button
                              size="sm"
                              onClick={() => handleFlagMedia(item.id)}
                              className="w-full"
                            >
                              Submit Flag
                            </Button>
                          </div>
                        )}
                        
                        {item.flagged && item.warning_message && (
                          <p className="text-xs text-red-600 mt-1">{item.warning_message}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {expandedImage && (
        <Dialog open={!!expandedImage} onOpenChange={() => setExpandedImage(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>Image Preview</DialogTitle>
                <Button variant="ghost" size="sm" onClick={() => setExpandedImage(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </DialogHeader>
            <div className="flex justify-center">
              <img 
                src={expandedImage} 
                alt="Expanded view" 
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {playingVideo && (
        <Dialog open={!!playingVideo} onOpenChange={() => setPlayingVideo(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>Video Player</DialogTitle>
                <Button variant="ghost" size="sm" onClick={() => setPlayingVideo(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </DialogHeader>
            <div className="flex justify-center">
              <video 
                src={playingVideo} 
                controls 
                autoPlay
                className="max-w-full max-h-[70vh]"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default AdminUserDetailsEnhanced;