import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';
import { getAdminUserId } from '@/lib/adminAuth';
import { Play, Flag, X, Trash2, ShieldOff, ShieldCheck } from 'lucide-react';

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
  is_active?: boolean;
  deactivated_at?: string;
  referred_by?: string;
  referred_by_photo?: string;
}

interface Media {
  id: string;
  url: string;
  type: 'photo' | 'video';
  flagged?: boolean;
  warning_message?: string;
  content_tier?: string;
  storage_path?: string;
}

interface AdminUserDetailsEnhancedProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated?: () => void;
}

const callAdminData = async (action: string, params: Record<string, unknown> = {}) => {
  const adminUserId = getAdminUserId();
  if (!adminUserId) throw new Error('Not authenticated as admin');

  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action, adminUserId, ...params }),
  });

  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || 'Request failed');
  return json.data;
};

const AdminUserDetailsEnhanced: React.FC<AdminUserDetailsEnhancedProps> = ({ 
  user, isOpen, onClose, onUserUpdated 
}) => {
  const [media, setMedia] = useState<Media[]>([]);
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});
  const [flagMessage, setFlagMessage] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user && isOpen) fetchUserMedia();
  }, [user, isOpen]);

  const resolveSignedUrls = async (items: Media[]) => {
    const urls: Record<string, string> = {};
    for (const item of items) {
      const rawUrl = item.url || '';
      if (rawUrl.includes('/private-media/') || item.storage_path) {
        let storagePath = item.storage_path || '';
        if (!storagePath && rawUrl.includes('/private-media/')) {
          storagePath = rawUrl.split('/private-media/').pop() || '';
          storagePath = decodeURIComponent(storagePath.split('?')[0]);
        }
        if (storagePath) {
          try {
            const { data } = await supabase.storage.from('private-media').createSignedUrl(storagePath, 3600);
            if (data?.signedUrl) urls[item.id] = data.signedUrl;
          } catch (e) { console.error('Signed URL error:', e); }
        }
      }
    }
    setResolvedUrls(urls);
  };

  const fetchUserMedia = async () => {
    if (!user) return;
    try {
      const data = await callAdminData('fetchUserMedia', { userId: user.id });
      const transformedMedia: Media[] = (data || []).map((item: any) => ({
        id: item.id, url: item.media_url, type: item.media_type as 'photo' | 'video',
        flagged: item.flagged, warning_message: item.flagged_message || item.warning_message,
        content_tier: item.content_tier, storage_path: item.storage_path,
      }));
      setMedia(transformedMedia);
      resolveSignedUrls(transformedMedia);
    } catch (error) { console.error('Error fetching media:', error); }
  };

  const handleFlagMedia = async (mediaId: string) => {
    if (!flagMessage.trim()) {
      toast({ title: 'Error', description: 'Please enter a warning message', variant: 'destructive' });
      return;
    }
    try {
      await callAdminData('flagMedia', { mediaId, message: flagMessage });
      toast({ title: 'Success', description: 'Media flagged successfully' });
      setFlagMessage(''); setSelectedMedia(null); fetchUserMedia();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to flag media', variant: 'destructive' });
    }
  };

  const handleDeactivateUser = async () => {
    if (!user || !confirm('Are you sure you want to deactivate this user? They will be unable to log in.')) return;
    setActionLoading(true);
    try {
      await callAdminData('deactivateUser', { userId: user.id });
      toast({ title: 'Success', description: 'User deactivated. Notification email sent.' });
      if (onUserUpdated) onUserUpdated();
      onClose();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to deactivate user', variant: 'destructive' });
    } finally { setActionLoading(false); }
  };

  const handleReactivateUser = async () => {
    if (!user || !confirm('Are you sure you want to reactivate this user?')) return;
    setActionLoading(true);
    try {
      await callAdminData('reactivateUser', { userId: user.id });
      toast({ title: 'Success', description: 'User reactivated successfully' });
      if (onUserUpdated) onUserUpdated();
      onClose();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to reactivate user', variant: 'destructive' });
    } finally { setActionLoading(false); }
  };

  const handleDeleteUser = async () => {
    if (!user || !confirm('⚠️ PERMANENT ACTION: Are you sure you want to permanently delete this user? This cannot be undone.')) return;
    setActionLoading(true);
    try {
      await callAdminData('deleteUser', { userId: user.id });
      toast({ title: 'Success', description: 'User permanently deleted' });
      if (onUserUpdated) onUserUpdated();
      onClose();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete user', variant: 'destructive' });
    } finally { setActionLoading(false); }
  };

  const getMediaUrl = (item: Media) => resolvedUrls[item.id] || item.url;

  const getUserTypeDisplay = (userType: string) => {
    switch (userType.toLowerCase()) {
      case 'stripper': return 'Stripper';
      case 'exotic': return 'Exotic';
      case 'male': return 'Male';
      case 'female': case 'normal': return 'Female';
      default: return userType;
    }
  };

  if (!user) return null;

  const isDeactivated = user.is_active === false;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DialogTitle>User Details - {user.username}</DialogTitle>
                {isDeactivated && <Badge variant="destructive">Deactivated</Badge>}
              </div>
              <div className="flex items-center gap-2">
                {isDeactivated ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-green-500 text-green-600 hover:bg-green-50"
                    onClick={handleReactivateUser}
                    disabled={actionLoading}
                  >
                    <ShieldCheck className="w-4 h-4 mr-1" />
                    {actionLoading ? 'Processing...' : 'Reactivate'}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-orange-500 text-orange-600 hover:bg-orange-50"
                    onClick={handleDeactivateUser}
                    disabled={actionLoading}
                  >
                    <ShieldOff className="w-4 h-4 mr-1" />
                    {actionLoading ? 'Processing...' : 'Deactivate'}
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteUser}
                  disabled={actionLoading}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  {actionLoading ? 'Processing...' : 'Delete'}
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Profile Photo</h3>
                {user.profile_photo ? (
                  <img src={user.profile_photo} alt="Profile" className="w-full object-contain rounded-lg cursor-pointer hover:opacity-80" onClick={() => setExpandedImage(user.profile_photo!)} />
                ) : (
                  <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center"><span className="text-muted-foreground">No photo</span></div>
                )}
              </div>
              <div>
                <h3 className="font-semibold mb-2">Banner Photo</h3>
                {user.banner_photo ? (
                  <img src={user.banner_photo} alt="Banner" className="w-full object-contain rounded-lg cursor-pointer hover:opacity-80" onClick={() => setExpandedImage(user.banner_photo!)} />
                ) : (
                  <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center"><span className="text-muted-foreground">No banner</span></div>
                )}
              </div>
              <div>
                <h3 className="font-semibold mb-2">Front Page Photo</h3>
                {user.front_page_photo ? (
                  <img src={user.front_page_photo} alt="Front Page" className="w-full object-contain rounded-lg cursor-pointer hover:opacity-80" onClick={() => setExpandedImage(user.front_page_photo!)} />
                ) : (
                  <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center"><span className="text-muted-foreground">No photo</span></div>
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
                  {user.referred_by && (
                    <p><strong>Referred by:</strong> <span className="ml-2 font-medium text-primary">@{user.referred_by}</span></p>
                  )}
                  <p><strong>Status:</strong>{' '}
                    <Badge variant={isDeactivated ? 'destructive' : 'default'} className="ml-2">
                      {isDeactivated ? 'Deactivated' : 'Active'}
                    </Badge>
                  </p>
                  {user.deactivated_at && (
                    <p className="text-destructive"><strong>Deactivated on:</strong> {new Date(user.deactivated_at).toLocaleDateString()}</p>
                  )}
                  <p><strong>Joined:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Uploaded Media ({media.length})</h3>
              {media.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No media uploaded</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {media.map((item) => (
                    <div key={item.id} className="relative border rounded-lg overflow-hidden">
                      {item.type === 'photo' ? (
                        <img src={getMediaUrl(item)} alt="User media" className="w-full object-contain cursor-pointer hover:opacity-80" onClick={() => setExpandedImage(getMediaUrl(item))} />
                      ) : (
                        <div className="relative">
                          <video className="w-full max-h-[500px] object-contain" preload="metadata" muted>
                            <source src={getMediaUrl(item)} type="video/mp4" />
                          </video>
                          <Button size="sm" className="absolute inset-0 bg-black bg-opacity-50 hover:bg-opacity-70" onClick={() => setPlayingVideo(getMediaUrl(item))}>
                            <Play className="w-6 h-6 text-white" />
                          </Button>
                        </div>
                      )}
                      {item.flagged && <Badge variant="destructive" className="absolute top-1 right-1 text-xs">Flagged</Badge>}
                      <div className="p-2">
                        <Button size="sm" variant={selectedMedia === item.id ? "secondary" : "outline"} onClick={() => setSelectedMedia(selectedMedia === item.id ? null : item.id)} className="w-full mb-2">
                          <Flag className="w-3 h-3 mr-1" /> {item.flagged ? 'Flagged' : 'Flag'}
                        </Button>
                        {selectedMedia === item.id && (
                          <div className="space-y-2">
                            <Textarea placeholder="Warning message..." value={flagMessage} onChange={(e) => setFlagMessage(e.target.value)} rows={2} className="text-xs" />
                            <Button size="sm" onClick={() => handleFlagMedia(item.id)} className="w-full">Submit Flag</Button>
                          </div>
                        )}
                        {item.flagged && item.warning_message && <p className="text-xs text-destructive mt-1">{item.warning_message}</p>}
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
                <Button variant="ghost" size="sm" onClick={() => setExpandedImage(null)}><X className="w-4 h-4" /></Button>
              </div>
            </DialogHeader>
            <div className="flex justify-center">
              <img src={expandedImage} alt="Expanded view" className="max-w-full max-h-[70vh] object-contain" />
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
                <Button variant="ghost" size="sm" onClick={() => setPlayingVideo(null)}><X className="w-4 h-4" /></Button>
              </div>
            </DialogHeader>
            <div className="flex justify-center">
              <video controls autoPlay muted preload="auto" crossOrigin="anonymous" className="max-w-full max-h-[70vh]">
                <source src={playingVideo} type="video/mp4" />
              </video>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default AdminUserDetailsEnhanced;
