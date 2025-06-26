import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Edit, Save, X, Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface UserData {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  bio: string;
  profile_photo: string;
  banner_photo: string;
  user_type: string;
  gender: string;
  mobile_number?: string;
  created_at?: string;
  updated_at?: string;
  description?: string;
  occupation?: string;
  about_me?: string;
  membership_type?: string;
  referred_by?: string;
}

interface ProfileSectionProps {
  userData: UserData | null;
  setUserData: (data: UserData) => void;
}

const ProfileSectionEnhanced: React.FC<ProfileSectionProps> = ({ userData, setUserData }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(userData);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleBannerUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setEditData(prev => prev ? {...prev, banner_photo: e.target?.result as string} : null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setEditData(prev => prev ? {...prev, profile_photo: e.target?.result as string} : null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!editData) return;
    setIsLoading(true);
    try {
      const response = await fetch('https://qkcuykpndrolrewwnkwb.supabase.co/functions/v1/286a2fbe-3766-4c09-b153-0afa81647e6d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editData.id,
          email: editData.email,
          first_name: editData.first_name,
          last_name: editData.last_name,
          bio: editData.bio,
          mobile_number: editData.mobile_number,
          profile_photo: editData.profile_photo,
          banner_photo: editData.banner_photo,
          description: editData.description,
          occupation: editData.occupation,
          about_me: editData.about_me
        })
      });
      if (!response.ok) throw new Error('Failed to update profile');
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to update profile');
      setUserData(editData);
      setIsEditing(false);
      toast({ title: "Profile Updated", description: "Your profile has been successfully updated." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update profile. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!userData) return null;

  return (
    <div className="space-y-6">
      <Card className="bg-white/10 backdrop-blur border-white/20">
        <CardContent className="p-0">
          <div className="relative h-48 rounded-t-lg overflow-hidden">
            <img src={editData?.banner_photo || userData.banner_photo} alt="Banner" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
              <label className="cursor-pointer">
                <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
                <Button type="button" className="bg-white/20 backdrop-blur hover:bg-white/30">
                  <Camera className="w-4 h-4 mr-2" />Change Banner
                </Button>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white/10 backdrop-blur border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Camera className="w-5 h-5" />Profile Picture
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden border-4 border-white/30">
              <img src={editData?.profile_photo || userData.profile_photo} alt="Profile" className="w-full h-full object-cover" />
            </div>
            <label className="cursor-pointer">
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              <Button type="button" className="bg-blue-600 hover:bg-blue-700">
                <Camera className="w-4 h-4 mr-2" />Change Photo
              </Button>
            </label>
            {userData.created_at && (
              <div className="text-sm text-gray-300">
                <p>Joined: {new Date(userData.created_at).toLocaleDateString()}</p>
                {userData.updated_at && <p>Updated: {new Date(userData.updated_at).toLocaleDateString()}</p>}
              </div>
            )}
            {userData.description && <p className="text-white text-sm">{userData.description}</p>}
            {userData.occupation && <p className="text-gray-300 text-sm">Occupation: {userData.occupation}</p>}
            {userData.about_me && <p className="text-white text-sm">{userData.about_me}</p>}
            <div className="space-y-2">
              <Badge className="bg-purple-600 text-white">
                <Crown className="w-3 h-3 mr-1" />
                {userData.membership_type || 'Free'}
              </Badge>
              <Button onClick={() => navigate('/upgrade')} className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700">
                UPGRADE
              </Button>
            </div>
            {userData.referred_by && (
              <div className="flex items-center gap-2 justify-center">
                <span className="text-gray-300 text-sm">Referred by:</span>
                <Avatar className="w-6 h-6">
                  <AvatarImage src="/placeholder.svg" />
                  <AvatarFallback className="text-xs">{userData.referred_by[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="text-white text-sm">@{userData.referred_by}</span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="bg-white/10 backdrop-blur border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              Profile Information
              {!isEditing && (
                <Button onClick={() => setIsEditing(true)} size="sm" className="bg-purple-600 hover:bg-purple-700">
                  <Edit className="w-4 h-4 mr-2" />Edit
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white">First Name</Label>
                    <Input value={editData?.first_name || ''} onChange={(e) => setEditData(prev => prev ? {...prev, first_name: e.target.value} : null)} className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <div>
                    <Label className="text-white">Last Name</Label>
                    <Input value={editData?.last_name || ''} onChange={(e) => setEditData(prev => prev ? {...prev, last_name: e.target.value} : null)} className="bg-white/10 border-white/20 text-white" />
                  </div>
                </div>
                <div>
                  <Label className="text-white">Email Address</Label>
                  <Input type="email" value={editData?.email || ''} onChange={(e) => setEditData(prev => prev ? {...prev, email: e.target.value} : null)} className="bg-white/10 border-white/20 text-white" />
                </div>
                <div>
                  <Label className="text-white">Mobile Number</Label>
                  <Input value={editData?.mobile_number || ''} onChange={(e) => setEditData(prev => prev ? {...prev, mobile_number: e.target.value} : null)} className="bg-white/10 border-white/20 text-white" />
                </div>
                <div>
                  <Label className="text-white">Description</Label>
                  <Textarea value={editData?.description || ''} onChange={(e) => setEditData(prev => prev ? {...prev, description: e.target.value} : null)} className="bg-white/10 border-white/20 text-white" rows={2} />
                </div>
                <div>
                  <Label className="text-white">Occupation</Label>
                  <Input value={editData?.occupation || ''} onChange={(e) => setEditData(prev => prev ? {...prev, occupation: e.target.value} : null)} className="bg-white/10 border-white/20 text-white" />
                </div>
                <div>
                  <Label className="text-white">About Me</Label>
                  <Textarea value={editData?.about_me || ''} onChange={(e) => setEditData(prev => prev ? {...prev, about_me: e.target.value} : null)} className="bg-white/10 border-white/20 text-white" rows={2} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={isLoading} className="bg-green-600 hover:bg-green-700 flex-1">
                    <Save className="w-4 h-4 mr-2" />{isLoading ? 'Saving...' : 'Save'}
                  </Button>
                  <Button onClick={() => { setEditData(userData); setIsEditing(false); }} variant="outline" className="border-white/20 text-white hover:bg-white/10">
                    <X className="w-4 h-4 mr-2" />Cancel
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div><Label className="text-gray-400">Name</Label><p className="text-white">{userData.first_name} {userData.last_name}</p></div>
                <div><Label className="text-gray-400">Username</Label><p className="text-white">@{userData.username}</p></div>
                <div><Label className="text-gray-400">Email</Label><p className="text-white">{userData.email}</p></div>
                {userData.mobile_number && <div><Label className="text-gray-400">Mobile</Label><p className="text-white">{userData.mobile_number}</p></div>}
                <div><Label className="text-gray-400">Gender</Label><p className="text-white capitalize">{userData.gender}</p></div>
                <div><Label className="text-gray-400">User Type</Label><p className="text-white capitalize">{userData.user_type}</p></div>
                <div><Label className="text-gray-400">Bio</Label><p className="text-white">{userData.bio}</p></div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileSectionEnhanced;