import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Edit, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface ProfileSectionProps {
  userData: UserData | null;
  setUserData: (data: UserData) => void;
}

const formatPhoneNumber = (value: string) => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)})${cleaned.slice(3)}`;
  return `(${cleaned.slice(0, 3)})${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
};

const ProfileSection: React.FC<ProfileSectionProps> = ({ userData, setUserData }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(userData);
  const [isLoading, setIsLoading] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    setEditData(prev => prev ? {...prev, mobile_number: formatted} : null);
  };

  const handleBannerUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setBannerFile(file);
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
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setEditData(prev => prev ? {...prev, profile_photo: e.target?.result as string} : null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!editData) return;
    
    if (editData.mobile_number && editData.mobile_number.length > 0) {
      const phoneRegex = /^\(\d{3}\)\d{3}-\d{4}$/;
      if (!phoneRegex.test(editData.mobile_number)) {
        toast({
          title: "Invalid Phone Number",
          description: "Please format phone number as (xxx)xxx-xxxx",
          variant: "destructive"
        });
        return;
      }
    }
    
    setIsLoading(true);
    try {
      const response = await fetch('https://qkcuykpndrolrewwnkwb.supabase.co/functions/v1/286a2fbe-3766-4c09-b153-0afa81647e6d', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: editData.id,
          email: editData.email,
          first_name: editData.first_name,
          last_name: editData.last_name,
          bio: editData.bio,
          mobile_number: editData.mobile_number,
          address: editData.address,
          city: editData.city,
          state: editData.state,
          zip: editData.zip,
          gender: editData.gender,
          user_type: editData.user_type,
          profile_photo: editData.profile_photo,
          banner_photo: editData.banner_photo
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update profile`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update profile');
      }

      setUserData(editData);
      setIsEditing(false);
      setBannerFile(null);
      setPhotoFile(null);
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditData(userData);
    setIsEditing(false);
    setBannerFile(null);
    setPhotoFile(null);
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
          <CardContent className="text-center">
            <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden border-4 border-white/30">
              <img src={editData?.profile_photo || userData.profile_photo} alt="Profile" className="w-full h-full object-cover" />
            </div>
            <label className="cursor-pointer">
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              <Button type="button" className="bg-blue-600 hover:bg-blue-700">
                <Camera className="w-4 h-4 mr-2" />Change Photo
              </Button>
            </label>
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
                  <Input placeholder="(xxx)xxx-xxxx" value={editData?.mobile_number || ''} onChange={(e) => handlePhoneChange(e.target.value)} className="bg-white/10 border-white/20 text-white" maxLength={13} />
                </div>
                <div>
                  <Label className="text-white">Address</Label>
                  <Input value={editData?.address || ''} onChange={(e) => setEditData(prev => prev ? {...prev, address: e.target.value} : null)} className="bg-white/10 border-white/20 text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white">City</Label>
                    <Input value={editData?.city || ''} onChange={(e) => setEditData(prev => prev ? {...prev, city: e.target.value} : null)} className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <div>
                    <Label className="text-white">State</Label>
                    <Input value={editData?.state || ''} onChange={(e) => setEditData(prev => prev ? {...prev, state: e.target.value} : null)} className="bg-white/10 border-white/20 text-white" />
                  </div>
                </div>
                <div>
                  <Label className="text-white">ZIP Code</Label>
                  <Input value={editData?.zip || ''} onChange={(e) => setEditData(prev => prev ? {...prev, zip: e.target.value} : null)} className="bg-white/10 border-white/20 text-white" />
                </div>
                <div>
                  <Label className="text-white">Bio</Label>
                  <Textarea value={editData?.bio || ''} onChange={(e) => setEditData(prev => prev ? {...prev, bio: e.target.value} : null)} className="bg-white/10 border-white/20 text-white" rows={3} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={isLoading} className="bg-green-600 hover:bg-green-700 flex-1">
                    <Save className="w-4 h-4 mr-2" />{isLoading ? 'Saving...' : 'Save'}
                  </Button>
                  <Button onClick={handleCancel} variant="outline" className="border-white/20 text-white hover:bg-white/10">
                    <X className="w-4 h-4 mr-2" />Cancel
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div><Label className="text-gray-400">Name</Label><p className="text-white">{userData.first_name} {userData.last_name}</p></div>
                <div><Label className="text-gray-400">Username</Label><p className="text-white">@{userData.username}</p></div>
                <div><Label className="text-gray-400">Email</Label><p className="text-white">{userData.email}</p></div>
                {userData.mobile_number && (<div><Label className="text-gray-400">Mobile</Label><p className="text-white">{userData.mobile_number}</p></div>)}
                {userData.address && (
                  <div>
                    <Label className="text-gray-400">Address</Label>
                    <p className="text-white">{userData.address}</p>
                    {userData.city && userData.state && userData.zip && (
                      <p className="text-white">{userData.city}, {userData.state} {userData.zip}</p>
                    )}
                  </div>
                )}
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

export default ProfileSection;