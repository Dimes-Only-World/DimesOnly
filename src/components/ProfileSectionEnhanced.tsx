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
import SilverPlusCounter from "./SilverPlusCounter";
import SilverPlusMembership from "./SilverPlusMembership";
import { Tables } from "@/types";

// Convert local UserData to Tables<"users"> shape for SilverPlusMembership
function toTablesUser(userData: any): Tables<"users"> {
  return {
    id: userData.id,
    username: userData.username,
    email: userData.email,
    first_name: userData.first_name ?? null,
    last_name: userData.last_name ?? null,
    bio: userData.bio ?? null,
    profile_photo: userData.profile_photo ?? null,
    banner_photo: userData.banner_photo ?? null,
    user_type: userData.user_type ?? null,
    gender: userData.gender ?? null,
    mobile_number: userData.mobile_number ?? null,
    created_at: userData.created_at ?? null,
    updated_at: userData.updated_at ?? null,
    description: userData.description ?? null,
    occupation: userData.occupation ?? null,
    about_me: userData.about_me ?? null,
    membership_type: userData.membership_type ?? null,
    referred_by: userData.referred_by ?? null,
    diamond_plus_active: userData.diamond_plus_active ?? null,
    address: userData.address ?? null,
    city: userData.city ?? null,
    front_page_photo: userData.front_page_photo ?? null,
    hash_type: userData.hash_type ?? null,
    is_ranked: userData.is_ranked ?? null,
    lottery_tickets: userData.lottery_tickets ?? null,
    membership_tier: userData.membership_tier ?? null,
    overrides: userData.overrides ?? null,
    password_hash: userData.password_hash ?? '',
    paypal_email: userData.paypal_email ?? null,
    rank_number: userData.rank_number ?? null,
    referral_fees: userData.referral_fees ?? null,
    referred_by_photo: userData.referred_by_photo ?? null,
    register_order: userData.register_order ?? null,
    state: userData.state ?? null,
    tips_earned: userData.tips_earned ?? null,
    user_rank: userData.user_rank ?? null,
    weekly_earnings: userData.weekly_earnings ?? null,
    weekly_hours: userData.weekly_hours ?? null,
    zip: userData.zip ?? null,
    diamond_plus_signed_at: userData.diamond_plus_signed_at ?? null,
    diamond_plus_payment_id: userData.diamond_plus_payment_id ?? null,
    membership_count_position: userData.membership_count_position ?? null,
    phone_number: userData.phone_number ?? null,
    agreement_signed: userData.agreement_signed ?? null,
    notarization_completed: userData.notarization_completed ?? null,
    silver_plus_active: userData.silver_plus_active ?? null,
    silver_plus_joined_at: userData.silver_plus_joined_at ?? null,
    silver_plus_payment_id: userData.silver_plus_payment_id ?? null,
    silver_plus_membership_number: userData.silver_plus_membership_number ?? null
  };
}

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
  diamond_plus_active?: boolean; // For badge logic
  silver_plus_active?: boolean; // For Silver Plus logic
  // Optionally add other Silver Plus fields if needed
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

  // Determine Silver Plus eligibility
  const isSilverPlusEligible =
    (userData?.gender === "male" ||
      (userData?.gender === "female" && userData?.user_type === "normal")) &&
    !userData?.silver_plus_active &&
    !userData?.diamond_plus_active &&
    userData?.membership_type !== "diamond_plus";

  // Determine badge label
  let badgeLabel = "";
  if (userData.silver_plus_active) {
    badgeLabel = "Silver Plus Member";
  } else if (userData.diamond_plus_active) {
    badgeLabel = "Diamond Plus Member";
  } else {
    badgeLabel = "Free Member";
  }

  if (!userData) return null;

  return (
    <div className="space-y-6">
      <Card className="bg-white/10 backdrop-blur border-white/20">
        <CardContent className="p-0">
          {/* Upgrade Membership Button */}
          <div className="flex justify-center py-4">
            <Button className="bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold px-8 py-2 rounded-full text-lg shadow-lg">
              Upgrade Membership
            </Button>
          </div>
          {/* Silver Plus Counter & Upgrade Option for eligible users (moved below Upgrade button) */}
          {isSilverPlusEligible && (
            <div className="space-y-2 mt-2">
              <SilverPlusCounter />
              <SilverPlusMembership userData={toTablesUser(userData)} />
            </div>
          )}
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white/10 backdrop-blur border-white/20">
          <CardContent className="text-center space-y-4">
            <div className="flex flex-col items-center gap-2">
              <Badge className="text-xs px-3 py-1" variant="secondary">{badgeLabel}</Badge>
              <div className="text-gray-400 text-xs">{userData.user_type === "normal" ? "Normal Member" : userData.user_type?.charAt(0).toUpperCase() + userData.user_type?.slice(1)}</div>
            </div>
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