import React from 'react';
import { Button } from '@/components/ui/button';
import { Lock, Crown, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ContentAccessControlProps {
  contentTier: 'free' | 'silver' | 'gold';
  userMembership: {
    membership_tier?: string;
    silver_plus_active?: boolean;
    diamond_plus_active?: boolean;
  };
  contentType?: 'photo' | 'video';
  children?: React.ReactNode;
}

const ContentAccessControl: React.FC<ContentAccessControlProps> = ({
  contentTier,
  userMembership,
  contentType = 'content',
  children
}) => {
  const navigate = useNavigate();

  const canAccess = (): boolean => {
    if (contentTier === 'free') return true;
    if (contentTier === 'silver' && (userMembership.silver_plus_active || userMembership.membership_tier === 'silver')) return true;
    if (contentTier === 'gold' && userMembership.diamond_plus_active) return true;
    return false;
  };

  const getTierInfo = () => {
    switch (contentTier) {
      case 'silver':
        return {
          name: 'Silver Plus',
          icon: <Star className="w-5 h-5 text-yellow-400" />,
          color: 'from-yellow-500 to-yellow-600',
          hoverColor: 'from-yellow-600 to-yellow-700'
        };
      case 'gold':
        return {
          name: 'Gold Plus',
          icon: <Crown className="w-5 h-5 text-yellow-500" />,
          color: 'from-yellow-400 to-orange-500',
          hoverColor: 'from-yellow-500 to-orange-600'
        };
      default:
        return {
          name: 'Free',
          icon: null,
          color: '',
          hoverColor: ''
        };
    }
  };

  if (canAccess()) {
    return <>{children}</>;
  }

  const tierInfo = getTierInfo();

  return (
    <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-lg border border-gray-600 p-6 text-center backdrop-blur-sm">
      <div className="flex items-center justify-center mb-4">
        <Lock className="w-12 h-12 text-gray-400 mr-3" />
        {tierInfo.icon}
      </div>
      
      <h3 className="text-xl font-bold text-white mb-2">
        {tierInfo.name} Content
      </h3>
      
      <p className="text-gray-300 mb-4">
        This {contentType} requires a {tierInfo.name.toLowerCase()} membership
      </p>
      
      <div className="space-y-3">
        <Button 
          onClick={() => {
            if (contentTier === 'silver') {
              navigate('/upgrade-silver-plus');
            } else if (contentTier === 'gold') {
              navigate('/upgrade-diamond');
            }
          }}
          className={`bg-gradient-to-r ${tierInfo.color} hover:${tierInfo.hoverColor} text-white font-semibold px-6 py-2`}
        >
          Upgrade to {tierInfo.name}
        </Button>
        
        <div className="text-xs text-gray-400">
          <p>• Access to exclusive {contentTier} content</p>
          <p>• Higher upload limits</p>
          <p>• Premium features</p>
        </div>
      </div>
    </div>
  );
};

export default ContentAccessControl;
