import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

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
  created_at: string;
}

interface Media {
  id: string;
  url: string;
  type: 'photo' | 'video';
  flagged?: boolean;
  warning_message?: string;
}

interface AdminUserDetailsProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}

const AdminUserDetails: React.FC<AdminUserDetailsProps> = ({ user, isOpen, onClose }) => {
  const [media, setMedia] = useState<Media[]>([]);
  const [flagMessage, setFlagMessage] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
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
        .eq('user_id', user.id);

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

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>User Details - {user.username}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Profile Information</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Username:</strong> {user.username}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Name:</strong> {user.first_name} {user.last_name}</p>
                <p><strong>Phone:</strong> {user.phone || 'N/A'}</p>
                <p><strong>Location:</strong> {user.city}, {user.state}</p>
                <p><strong>Type:</strong> <Badge>{user.user_type}</Badge></p>
                <p><strong>Joined:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            
            <div>
              {user.profile_photo && (
                <img 
                  src={user.profile_photo} 
                  alt="Profile" 
                  className="w-32 h-32 object-cover rounded-lg"
                />
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Media ({media.length})</h3>
            <div className="grid grid-cols-3 gap-4">
              {media.map((item) => (
                <div key={item.id} className="relative border rounded-lg p-2">
                  {item.type === 'photo' ? (
                    <img src={item.url} alt="User media" className="w-full h-24 object-cover rounded" />
                  ) : (
                    <video src={item.url} className="w-full h-24 object-cover rounded" />
                  )}
                  
                  {item.flagged && (
                    <Badge variant="destructive" className="absolute top-1 right-1 text-xs">
                      Flagged
                    </Badge>
                  )}
                  
                  <div className="mt-2">
                    <Button
                      size="sm"
                      variant={selectedMedia === item.id ? "secondary" : "outline"}
                      onClick={() => setSelectedMedia(selectedMedia === item.id ? null : item.id)}
                      className="w-full"
                    >
                      {item.flagged ? 'Flagged' : 'Flag'}
                    </Button>
                  </div>
                  
                  {selectedMedia === item.id && (
                    <div className="mt-2 space-y-2">
                      <Textarea
                        placeholder="Warning message..."
                        value={flagMessage}
                        onChange={(e) => setFlagMessage(e.target.value)}
                        rows={2}
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
                </div>
              ))}
            </div>
            
            {media.length === 0 && (
              <p className="text-gray-500 text-center py-4">No media uploaded</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminUserDetails;