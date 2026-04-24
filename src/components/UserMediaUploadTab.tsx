import React from 'react';
import MediaUploadSection from './MediaUploadSection';
import { Button } from '@/components/ui/button';
import { Crown, Star, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UserMediaUploadTabProps {
  userData: any;
  onUpdate?: (data: any) => Promise<boolean>;
}

const UserMediaUploadTab: React.FC<UserMediaUploadTabProps> = ({ userData, onUpdate }) => {
  const navigate = useNavigate();
  
  const handleUpdate = async (data: any) => {
    if (onUpdate) {
      return await onUpdate(data);
    }
    return false;
  };

  const getMembershipStatus = () => {
    const rawTier = String(userData?.membership_tier || userData?.membership_type || '').toLowerCase();
    const isDiamondPlus = Boolean(userData?.diamond_plus_active) || rawTier === 'diamond_plus';
    const isSilverPlus = Boolean(userData?.silver_plus_active) || rawTier === 'silver_plus';

    if (isDiamondPlus) {
      return { tier: 'Diamond Plus', icon: <Crown className="w-5 h-5 text-yellow-500" />, color: 'from-yellow-400 to-orange-500' };
    }
    if (isSilverPlus) {
      return { tier: 'Silver Plus', icon: <Star className="w-5 h-5 text-yellow-400" />, color: 'from-yellow-500 to-yellow-600' };
    }
    if (rawTier === 'gold') {
      return { tier: 'Gold', icon: <Crown className="w-5 h-5 text-orange-500" />, color: 'from-yellow-400 to-orange-500' };
    }
    if (rawTier === 'silver') {
      return { tier: 'Silver', icon: <Star className="w-5 h-5 text-gray-200" />, color: 'from-gray-500 to-gray-600' };
    }
    return { tier: 'Free', icon: <Lock className="w-5 h-5 text-gray-400" />, color: 'from-gray-500 to-gray-600' };
  };

  const membershipStatus = getMembershipStatus();

  return (
    <div className="space-y-6">
      {/* Membership Status Banner */}
      <div className={`bg-gradient-to-r ${membershipStatus.color} text-white rounded-lg p-4 shadow-lg`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {membershipStatus.icon}
            <div>
              <h3 className="font-semibold text-lg">{membershipStatus.tier} Member</h3>
              <p className="text-sm opacity-90">
                {membershipStatus.tier === 'Free' 
                  ? 'Upgrade to unlock more features and upload limits'
                  : 'You have access to premium features and higher upload limits'
                }
              </p>
            </div>
          </div>
          
          {membershipStatus.tier === 'Free' && (
            <Button 
              onClick={() => navigate('/upgrade-silver-plus')}
              variant="secondary"
              className="bg-white text-gray-800 hover:bg-gray-100 font-semibold"
            >
              Upgrade Now
            </Button>
          )}
        </div>
      </div>

      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Media Upload</h2>
        <p className="text-gray-600">
          Upload your profile images and manage your photo and video gallery. 
          {membershipStatus.tier === 'Free' && ' Upgrade to unlock higher upload limits and exclusive content tiers.'}
        </p>
      </div>
      
      <MediaUploadSection userData={userData} onUpdate={handleUpdate} />

      {/* Upgrade Benefits */}
      {membershipStatus.tier === 'Free' && (
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            Unlock Premium Features
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="text-center">
              <Star className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
              <h4 className="font-semibold text-gray-900 mb-2">Silver Plus</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Upload up to 260 photos</li>
                <li>• Upload up to 48 videos</li>
                <li>• Access to Silver content</li>
                <li>• Priority support</li>
              </ul>
              <Button 
                onClick={() => navigate('/upgrade-silver-plus')}
                className="mt-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700"
              >
                Upgrade to Silver Plus
              </Button>
            </div>
            
            <div className="text-center">
              <Crown className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
              <h4 className="font-semibold text-gray-900 mb-2">Diamond Plus</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Unlimited uploads</li>
                <li>• Access to all content tiers</li>
                <li>• Premium features</li>
                <li>• VIP support</li>
              </ul>
              <Button 
                onClick={() => navigate('/upgrade-diamond')}
                className="mt-3 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600"
              >
                Upgrade to Diamond Plus
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMediaUploadTab;