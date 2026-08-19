import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';
import { getAdminUserId } from '@/lib/adminAuth';
import { Play, Flag, X, Trash2, ShieldOff, ShieldCheck } from 'lucide-react';
import { MEMBERSHIP_OPTIONS, resolveMembership } from '@/lib/membership';

type ContentTier = 'free' | 'silver' | 'gold';

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
  approval_status?: string;
}

interface Media {
  id: string;
  url: string;
  signed_url?: string;
  type: 'photo' | 'video';
  flagged?: boolean;
  warning_message?: string;
  content_tier?: ContentTier;
  storage_path?: string;
}

const contentTiers: Array<{ key: ContentTier; label: string; description: string }> = [
  { key: 'free', label: 'Silver Content', description: 'Entry-level member content' },
  { key: 'silver', label: 'Gold Content', description: 'Gold member content' },
  { key: 'gold', label: 'Diamond Content', description: 'Diamond member content' },
];

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
  const [flagMessage, setFlagMessage] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [tierUpdatingId, setTierUpdatingId] = useState<string | null>(null);
  const [membershipValue, setMembershipValue] = useState<string>('free');
  const [membershipSaving, setMembershipSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user && isOpen) {
      fetchUserMedia();
      setMembershipValue(resolveMembership(user).key);
    }
  }, [user, isOpen]);

  const fetchUserMedia = async () => {
    if (!user) return;
    try {
      const data = await callAdminData('fetchUserMedia', { userId: user.id });
      const transformedMedia: Media[] = (data || []).map((item: any) => ({
        id: item.id, url: item.media_url, signed_url: item.signed_url, type: item.media_type as 'photo' | 'video',
        flagged: item.flagged, warning_message: item.flagged_message || item.warning_message,
        content_tier: item.content_tier as ContentTier, storage_path: item.storage_path,
      }));
      setMedia(transformedMedia);
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

  const handleMembershipChange = async (tier: string) => {
    if (!user) return;
    setMembershipSaving(true);
    try {
      await callAdminData('updateMembership', { userId: user.id, tier });
      setMembershipValue(tier);
      toast({ title: 'Success', description: 'Membership updated' });
      if (onUserUpdated) onUserUpdated();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update membership', variant: 'destructive' });
    } finally {
      setMembershipSaving(false);
    }
  };

  const handleTierChange = async (mediaId: string, contentTier: ContentTier) => {
    setTierUpdatingId(mediaId);
    try {
      await callAdminData('updateMediaTier', { mediaId, contentTier });
      setMedia((current) => current.map((item) => item.id === mediaId ? { ...item, content_tier: contentTier } : item));
      toast({ title: 'Success', description: 'Media tier updated' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update media tier', variant: 'destructive' });
    } finally {
      setTierUpdatingId(null);
    }
  };

  const getMediaUrl = (item: Media) => item.signed_url || item.url;

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

  const renderMediaCard = (item: Media) => {
    const mediaUrl = getMediaUrl(item);

    return (
      <div key={item.id} className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="relative bg-muted">
          {item.type === 'photo' ? (
            <img
              src={mediaUrl}
              alt="Uploaded user media"
              className="h-32 w-full cursor-pointer object-cover transition-opacity hover:opacity-80"
              loading="lazy"
              onClick={() => setExpandedImage(mediaUrl)}
            />
          ) : (
            <button
              type="button"
              className="group relative h-32 w-full overflow-hidden bg-muted text-left"
              onClick={() => setPlayingVideo(mediaUrl)}
              aria-label="Play uploaded video"
            >
              import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';
import { getAdminUserId } from '@/lib/adminAuth';
import { Play, Flag, X, Trash2, ShieldOff, ShieldCheck } from 'lucide-react';
import { MEMBERSHIP_OPTIONS, resolveMembership } from '@/lib/membership';

type ContentTier = 'free' | 'silver' | 'gold';

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
  approval_status?: string;
}

interface Media {
  id: string;
  url: string;
  signed_url?: string;
  type: 'photo' | 'video';
  flagged?: boolean;
  warning_message?: string;
  content_tier?: ContentTier;
  storage_path?: string;
}

const contentTiers: Array<{ key: ContentTier; label: string; description: string }> = [
  { key: 'free', label: 'Silver Content', description: 'Entry-level member content' },
  { key: 'silver', label: 'Gold Content', description: 'Gold member content' },
  { key: 'gold', label: 'Diamond Content', description: 'Diamond member content' },
];

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
  const [flagMessage, setFlagMessage] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [tierUpdatingId, setTierUpdatingId] = useState<string | null>(null);
  const [membershipValue, setMembershipValue] = useState<string>('free');
  const [membershipSaving, setMembershipSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user && isOpen) {
      fetchUserMedia();
      setMembershipValue(resolveMembership(user).key);
    }
  }, [user, isOpen]);

  const fetchUserMedia = async () => {
    if (!user) return;
    try {
      const data = await callAdminData('fetchUserMedia', { userId: user.id });
      const transformedMedia: Media[] = (data || []).map((item: any) => ({
        id: item.id, url: item.media_url, signed_url: item.signed_url, type: item.media_type as 'photo' | 'video',
        flagged: item.flagged, warning_message: item.flagged_message || item.warning_message,
        content_tier: item.content_tier as ContentTier, storage_path: item.storage_path,
      }));
      setMedia(transformedMedia);
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

  const handleMembershipChange = async (tier: string) => {
    if (!user) return;
    setMembershipSaving(true);
    try {
      await callAdminData('updateMembership', { userId: user.id, tier });
      setMembershipValue(tier);
      toast({ title: 'Success', description: 'Membership updated' });
      if (onUserUpdated) onUserUpdated();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update membership', variant: 'destructive' });
    } finally {
      setMembershipSaving(false);
    }
  };

  const handleTierChange = async (mediaId: string, contentTier: ContentTier) => {
    setTierUpdatingId(mediaId);
    try {
      await callAdminData('updateMediaTier', { mediaId, contentTier });
      setMedia((current) => current.map((item) => item.id === mediaId ? { ...item, content_tier: contentTier } : item));
      toast({ title: 'Success', description: 'Media tier updated' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update media tier', variant: 'destructive' });
    } finally {
      setTierUpdatingId(null);
    }
  };

  const getMediaUrl = (item: Media) => item.signed_url || item.url;

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

  const renderMediaCard = (item: Media) => {
    const mediaUrl = getMediaUrl(item);

    return (
      <div key={item.id} className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="relative bg-muted">
          {item.type === 'photo' ? (
            <img
              src={mediaUrl}
              alt="Uploaded user media"
              className="h-32 w-full cursor-pointer object-cover transition-opacity hover:opacity-80"
              loading="lazy"
              onClick={() => setExpandedImage(mediaUrl)}
            />
          ) : (
            <button
              type="button"
              className="group relative h-32 w-full overflow-hidden bg-muted text-left"
              onClick={() => setPlayingVideo(mediaUrl)}
              aria-label="Play uploaded video"
            >
              <video
                key={mediaUrl}
                className="h-32 w-full object-cover"
                preload="metadata"
                muted
                playsInline
                src={mediaUrl}
              / controlsList="nodownload" disablePictureInPicture disableRemotePlayback>
              <span className="absolute inset-0 flex items-center justify-center bg-background/55 transition-colors group-hover:bg-background/70">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                  <Play className="h-5 w-5" />
                </span>
              </span>
            </button>
          )}
          {item.flagged && <Badge variant="destructive" className="absolute right-2 top-2">Flagged</Badge>}
        </div>

        <div className="space-y-2 p-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Move content to</p>
            <Select
              value={item.content_tier || 'free'}
              onValueChange={(value) => handleTierChange(item.id, value as ContentTier)}
              disabled={tierUpdatingId === item.id}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select tier" />
              </SelectTrigger>
              <SelectContent>
                {contentTiers.map((tier) => (
                  <SelectItem key={tier.key} value={tier.key}>{tier.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            size="sm"
            variant={selectedMedia === item.id ? 'secondary' : 'outline'}
            onClick={() => setSelectedMedia(selectedMedia === item.id ? null : item.id)}
            className="h-8 w-full text-xs"
          >
            <Flag className="mr-1 h-3 w-3" /> {item.flagged ? 'Flagged' : 'Flag'}
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
              <Button size="sm" onClick={() => handleFlagMedia(item.id)} className="h-8 w-full text-xs">Submit Flag</Button>
            </div>
          )}

          {item.flagged && item.warning_message && <p className="line-clamp-2 text-xs text-destructive">{item.warning_message}</p>}
        </div>
      </div>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <DialogHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
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
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  disabled={actionLoading}
                >
                  Close
                </Button>
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
            <div className="grid grid-cols-3 gap-4">
              <div>
                <h3 className="font-semibold mb-2 text-sm">Profile Photo</h3>
                {user.profile_photo ? (
                  <img src={user.profile_photo} alt="Profile" className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 border" onClick={() => setExpandedImage(user.profile_photo!)} />
                ) : (
                  <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center"><span className="text-xs text-muted-foreground">No photo</span></div>
                )}
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-sm">Banner Photo</h3>
                {user.banner_photo ? (
                  <img src={user.banner_photo} alt="Banner" className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 border" onClick={() => setExpandedImage(user.banner_photo!)} />
                ) : (
                  <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center"><span className="text-xs text-muted-foreground">No banner</span></div>
                )}
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-sm">Front Page Photo</h3>
                {user.front_page_photo ? (
                  <img src={user.front_page_photo} alt="Front Page" className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 border" onClick={() => setExpandedImage(user.front_page_photo!)} />
                ) : (
                  <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center"><span className="text-xs text-muted-foreground">No photo</span></div>
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
                  {(user.user_type === 'stripper' || user.user_type === 'exotic') && (
                    <p><strong>Approval:</strong>{' '}
                      <Badge
                        variant={user.approval_status === 'approved' ? 'default' : user.approval_status === 'not_approved' ? 'destructive' : 'secondary'}
                        className="ml-1"
                      >
                        {user.approval_status === 'approved' ? 'Approved' : user.approval_status === 'not_approved' ? 'Not Approved' : 'Pending'}
                      </Badge>
                    </p>
                  )}
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
                  <div className="pt-2">
                    <p className="mb-1"><strong>Membership:</strong>{' '}
                      <Badge className="ml-1">{resolveMembership(user).label}</Badge>
                    </p>
                    <Select
                      value={membershipValue}
                      onValueChange={handleMembershipChange}
                      disabled={membershipSaving}
                    >
                      <SelectTrigger className="w-56">
                        <SelectValue placeholder="Change membership" />
                      </SelectTrigger>
                      <SelectContent>
                        {MEMBERSHIP_OPTIONS.map((option) => (
                          <SelectItem key={option.key} value={option.key}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {membershipSaving && <p className="mt-1 text-xs text-muted-foreground">Saving…</p>}
                  </div>
                </div>
              </div>
            </div>


            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">Uploaded Media ({media.length})</h3>
                  <p className="text-sm text-muted-foreground">Review, preview, and move each item to the correct member tier.</p>
                </div>
              </div>
              {media.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No media uploaded</p>
              ) : (
                <div className="space-y-6">
                  {contentTiers.map((tier) => {
                    const tierMedia = media.filter((item) => (item.content_tier || 'free') === tier.key);

                    return (
                      <section key={tier.key} className="rounded-lg border bg-muted/20 p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h4 className="font-semibold">{tier.label}</h4>
                            <p className="text-xs text-muted-foreground">{tier.description}</p>
                          </div>
                          <Badge variant="secondary">{tierMedia.length} item{tierMedia.length === 1 ? '' : 's'}</Badge>
                        </div>

                        {tierMedia.length === 0 ? (
                          <div className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">No media in this tier</div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                            {tierMedia.map(renderMediaCard)}
                          </div>
                        )}
                      </section>
                    );
                  })}
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
              <video key={playingVideo} controls autoPlay playsInline preload="auto" className="max-h-[70vh] max-w-full" src={playingVideo} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default AdminUserDetailsEnhanced;

              <span className="absolute inset-0 flex items-center justify-center bg-background/55 transition-colors group-hover:bg-background/70">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                  <Play className="h-5 w-5" />
                </span>
              </span>
            </button>
          )}
          {item.flagged && <Badge variant="destructive" className="absolute right-2 top-2">Flagged</Badge>}
        </div>

        <div className="space-y-2 p-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Move content to</p>
            <Select
              value={item.content_tier || 'free'}
              onValueChange={(value) => handleTierChange(item.id, value as ContentTier)}
              disabled={tierUpdatingId === item.id}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select tier" />
              </SelectTrigger>
              <SelectContent>
                {contentTiers.map((tier) => (
                  <SelectItem key={tier.key} value={tier.key}>{tier.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            size="sm"
            variant={selectedMedia === item.id ? 'secondary' : 'outline'}
            onClick={() => setSelectedMedia(selectedMedia === item.id ? null : item.id)}
            className="h-8 w-full text-xs"
          >
            <Flag className="mr-1 h-3 w-3" /> {item.flagged ? 'Flagged' : 'Flag'}
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
              <Button size="sm" onClick={() => handleFlagMedia(item.id)} className="h-8 w-full text-xs">Submit Flag</Button>
            </div>
          )}

          {item.flagged && item.warning_message && <p className="line-clamp-2 text-xs text-destructive">{item.warning_message}</p>}
        </div>
      </div>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <DialogHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
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
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  disabled={actionLoading}
                >
                  Close
                </Button>
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
            <div className="grid grid-cols-3 gap-4">
              <div>
                <h3 className="font-semibold mb-2 text-sm">Profile Photo</h3>
                {user.profile_photo ? (
                  <img src={user.profile_photo} alt="Profile" className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 border" onClick={() => setExpandedImage(user.profile_photo!)} />
                ) : (
                  <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center"><span className="text-xs text-muted-foreground">No photo</span></div>
                )}
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-sm">Banner Photo</h3>
                {user.banner_photo ? (
                  <img src={user.banner_photo} alt="Banner" className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 border" onClick={() => setExpandedImage(user.banner_photo!)} />
                ) : (
                  <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center"><span className="text-xs text-muted-foreground">No banner</span></div>
                )}
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-sm">Front Page Photo</h3>
                {user.front_page_photo ? (
                  <img src={user.front_page_photo} alt="Front Page" className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 border" onClick={() => setExpandedImage(user.front_page_photo!)} />
                ) : (
                  <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center"><span className="text-xs text-muted-foreground">No photo</span></div>
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
                  {(user.user_type === 'stripper' || user.user_type === 'exotic') && (
                    <p><strong>Approval:</strong>{' '}
                      <Badge
                        variant={user.approval_status === 'approved' ? 'default' : user.approval_status === 'not_approved' ? 'destructive' : 'secondary'}
                        className="ml-1"
                      >
                        {user.approval_status === 'approved' ? 'Approved' : user.approval_status === 'not_approved' ? 'Not Approved' : 'Pending'}
                      </Badge>
                    </p>
                  )}
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
                  <div className="pt-2">
                    <p className="mb-1"><strong>Membership:</strong>{' '}
                      <Badge className="ml-1">{resolveMembership(user).label}</Badge>
                    </p>
                    <Select
                      value={membershipValue}
                      onValueChange={handleMembershipChange}
                      disabled={membershipSaving}
                    >
                      <SelectTrigger className="w-56">
                        <SelectValue placeholder="Change membership" />
                      </SelectTrigger>
                      <SelectContent>
                        {MEMBERSHIP_OPTIONS.map((option) => (
                          <SelectItem key={option.key} value={option.key}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {membershipSaving && <p className="mt-1 text-xs text-muted-foreground">Saving…</p>}
                  </div>
                </div>
              </div>
            </div>


            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">Uploaded Media ({media.length})</h3>
                  <p className="text-sm text-muted-foreground">Review, preview, and move each item to the correct member tier.</p>
                </div>
              </div>
              {media.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No media uploaded</p>
              ) : (
                <div className="space-y-6">
                  {contentTiers.map((tier) => {
                    const tierMedia = media.filter((item) => (item.content_tier || 'free') === tier.key);

                    return (
                      <section key={tier.key} className="rounded-lg border bg-muted/20 p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h4 className="font-semibold">{tier.label}</h4>
                            <p className="text-xs text-muted-foreground">{tier.description}</p>
                          </div>
                          <Badge variant="secondary">{tierMedia.length} item{tierMedia.length === 1 ? '' : 's'}</Badge>
                        </div>

                        {tierMedia.length === 0 ? (
                          <div className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">No media in this tier</div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                            {tierMedia.map(renderMediaCard)}
                          </div>
                        )}
                      </section>
                    );
                  })}
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
              import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';
import { getAdminUserId } from '@/lib/adminAuth';
import { Play, Flag, X, Trash2, ShieldOff, ShieldCheck } from 'lucide-react';
import { MEMBERSHIP_OPTIONS, resolveMembership } from '@/lib/membership';

type ContentTier = 'free' | 'silver' | 'gold';

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
  approval_status?: string;
}

interface Media {
  id: string;
  url: string;
  signed_url?: string;
  type: 'photo' | 'video';
  flagged?: boolean;
  warning_message?: string;
  content_tier?: ContentTier;
  storage_path?: string;
}

const contentTiers: Array<{ key: ContentTier; label: string; description: string }> = [
  { key: 'free', label: 'Silver Content', description: 'Entry-level member content' },
  { key: 'silver', label: 'Gold Content', description: 'Gold member content' },
  { key: 'gold', label: 'Diamond Content', description: 'Diamond member content' },
];

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
  const [flagMessage, setFlagMessage] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [tierUpdatingId, setTierUpdatingId] = useState<string | null>(null);
  const [membershipValue, setMembershipValue] = useState<string>('free');
  const [membershipSaving, setMembershipSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user && isOpen) {
      fetchUserMedia();
      setMembershipValue(resolveMembership(user).key);
    }
  }, [user, isOpen]);

  const fetchUserMedia = async () => {
    if (!user) return;
    try {
      const data = await callAdminData('fetchUserMedia', { userId: user.id });
      const transformedMedia: Media[] = (data || []).map((item: any) => ({
        id: item.id, url: item.media_url, signed_url: item.signed_url, type: item.media_type as 'photo' | 'video',
        flagged: item.flagged, warning_message: item.flagged_message || item.warning_message,
        content_tier: item.content_tier as ContentTier, storage_path: item.storage_path,
      }));
      setMedia(transformedMedia);
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

  const handleMembershipChange = async (tier: string) => {
    if (!user) return;
    setMembershipSaving(true);
    try {
      await callAdminData('updateMembership', { userId: user.id, tier });
      setMembershipValue(tier);
      toast({ title: 'Success', description: 'Membership updated' });
      if (onUserUpdated) onUserUpdated();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update membership', variant: 'destructive' });
    } finally {
      setMembershipSaving(false);
    }
  };

  const handleTierChange = async (mediaId: string, contentTier: ContentTier) => {
    setTierUpdatingId(mediaId);
    try {
      await callAdminData('updateMediaTier', { mediaId, contentTier });
      setMedia((current) => current.map((item) => item.id === mediaId ? { ...item, content_tier: contentTier } : item));
      toast({ title: 'Success', description: 'Media tier updated' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update media tier', variant: 'destructive' });
    } finally {
      setTierUpdatingId(null);
    }
  };

  const getMediaUrl = (item: Media) => item.signed_url || item.url;

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

  const renderMediaCard = (item: Media) => {
    const mediaUrl = getMediaUrl(item);

    return (
      <div key={item.id} className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="relative bg-muted">
          {item.type === 'photo' ? (
            <img
              src={mediaUrl}
              alt="Uploaded user media"
              className="h-32 w-full cursor-pointer object-cover transition-opacity hover:opacity-80"
              loading="lazy"
              onClick={() => setExpandedImage(mediaUrl)}
            />
          ) : (
            <button
              type="button"
              className="group relative h-32 w-full overflow-hidden bg-muted text-left"
              onClick={() => setPlayingVideo(mediaUrl)}
              aria-label="Play uploaded video"
            >
              <video
                key={mediaUrl}
                className="h-32 w-full object-cover"
                preload="metadata"
                muted
                playsInline
                src={mediaUrl}
              />
              <span className="absolute inset-0 flex items-center justify-center bg-background/55 transition-colors group-hover:bg-background/70">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                  <Play className="h-5 w-5" />
                </span>
              </span>
            </button>
          )}
          {item.flagged && <Badge variant="destructive" className="absolute right-2 top-2">Flagged</Badge>}
        </div>

        <div className="space-y-2 p-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Move content to</p>
            <Select
              value={item.content_tier || 'free'}
              onValueChange={(value) => handleTierChange(item.id, value as ContentTier)}
              disabled={tierUpdatingId === item.id}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select tier" />
              </SelectTrigger>
              <SelectContent>
                {contentTiers.map((tier) => (
                  <SelectItem key={tier.key} value={tier.key}>{tier.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            size="sm"
            variant={selectedMedia === item.id ? 'secondary' : 'outline'}
            onClick={() => setSelectedMedia(selectedMedia === item.id ? null : item.id)}
            className="h-8 w-full text-xs"
          >
            <Flag className="mr-1 h-3 w-3" /> {item.flagged ? 'Flagged' : 'Flag'}
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
              <Button size="sm" onClick={() => handleFlagMedia(item.id)} className="h-8 w-full text-xs">Submit Flag</Button>
            </div>
          )}

          {item.flagged && item.warning_message && <p className="line-clamp-2 text-xs text-destructive">{item.warning_message}</p>}
        </div>
      </div>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <DialogHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
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
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  disabled={actionLoading}
                >
                  Close
                </Button>
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
            <div className="grid grid-cols-3 gap-4">
              <div>
                <h3 className="font-semibold mb-2 text-sm">Profile Photo</h3>
                {user.profile_photo ? (
                  <img src={user.profile_photo} alt="Profile" className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 border" onClick={() => setExpandedImage(user.profile_photo!)} />
                ) : (
                  <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center"><span className="text-xs text-muted-foreground">No photo</span></div>
                )}
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-sm">Banner Photo</h3>
                {user.banner_photo ? (
                  <img src={user.banner_photo} alt="Banner" className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 border" onClick={() => setExpandedImage(user.banner_photo!)} />
                ) : (
                  <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center"><span className="text-xs text-muted-foreground">No banner</span></div>
                )}
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-sm">Front Page Photo</h3>
                {user.front_page_photo ? (
                  <img src={user.front_page_photo} alt="Front Page" className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 border" onClick={() => setExpandedImage(user.front_page_photo!)} />
                ) : (
                  <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center"><span className="text-xs text-muted-foreground">No photo</span></div>
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
                  {(user.user_type === 'stripper' || user.user_type === 'exotic') && (
                    <p><strong>Approval:</strong>{' '}
                      <Badge
                        variant={user.approval_status === 'approved' ? 'default' : user.approval_status === 'not_approved' ? 'destructive' : 'secondary'}
                        className="ml-1"
                      >
                        {user.approval_status === 'approved' ? 'Approved' : user.approval_status === 'not_approved' ? 'Not Approved' : 'Pending'}
                      </Badge>
                    </p>
                  )}
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
                  <div className="pt-2">
                    <p className="mb-1"><strong>Membership:</strong>{' '}
                      <Badge className="ml-1">{resolveMembership(user).label}</Badge>
                    </p>
                    <Select
                      value={membershipValue}
                      onValueChange={handleMembershipChange}
                      disabled={membershipSaving}
                    >
                      <SelectTrigger className="w-56">
                        <SelectValue placeholder="Change membership" />
                      </SelectTrigger>
                      <SelectContent>
                        {MEMBERSHIP_OPTIONS.map((option) => (
                          <SelectItem key={option.key} value={option.key}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {membershipSaving && <p className="mt-1 text-xs text-muted-foreground">Saving…</p>}
                  </div>
                </div>
              </div>
            </div>


            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">Uploaded Media ({media.length})</h3>
                  <p className="text-sm text-muted-foreground">Review, preview, and move each item to the correct member tier.</p>
                </div>
              </div>
              {media.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No media uploaded</p>
              ) : (
                <div className="space-y-6">
                  {contentTiers.map((tier) => {
                    const tierMedia = media.filter((item) => (item.content_tier || 'free') === tier.key);

                    return (
                      <section key={tier.key} className="rounded-lg border bg-muted/20 p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h4 className="font-semibold">{tier.label}</h4>
                            <p className="text-xs text-muted-foreground">{tier.description}</p>
                          </div>
                          <Badge variant="secondary">{tierMedia.length} item{tierMedia.length === 1 ? '' : 's'}</Badge>
                        </div>

                        {tierMedia.length === 0 ? (
                          <div className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">No media in this tier</div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                            {tierMedia.map(renderMediaCard)}
                          </div>
                        )}
                      </section>
                    );
                  })}
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
              <video key={playingVideo} controls autoPlay playsInline preload="auto" className="max-h-[70vh] max-w-full" src={playingVideo} / controlsList="nodownload" disablePictureInPicture disableRemotePlayback>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default AdminUserDetailsEnhanced;

            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default AdminUserDetailsEnhanced;
