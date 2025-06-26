import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { UserCheck, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ReferrerData {
  id: string;
  username: string;
  profile_photo?: string;
  user_type?: string;
}

interface ReferrerInfoProps {
  referredBy?: string;
}

const ReferrerInfo: React.FC<ReferrerInfoProps> = ({ referredBy }) => {
  const [referrerData, setReferrerData] = useState<ReferrerData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (referredBy) {
      fetchReferrerData();
    }
  }, [referredBy]);

  const fetchReferrerData = async () => {
    if (!referredBy) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, profile_photo, user_type')
        .eq('username', referredBy)
        .single();

      if (data && !error) {
        setReferrerData(data);
      }
    } catch (error) {
      console.error('Error fetching referrer data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!referredBy) {
    return null;
  }

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-blue-800 flex items-center gap-2">
          <UserCheck className="w-4 h-4" />
          Referred By
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center space-x-4">
          <Avatar className="w-16 h-16 border-2 border-blue-200">
            <AvatarImage 
              src={referrerData?.profile_photo || undefined} 
              alt={referrerData?.username || referredBy}
            />
            <AvatarFallback className="bg-blue-100 text-blue-700 text-lg font-semibold">
              {(referrerData?.username || referredBy).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">
                @{referrerData?.username || referredBy}
              </h3>
              {referrerData?.user_type && (
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${
                    referrerData.user_type === 'stripper' || referrerData.user_type === 'exotic'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {referrerData.user_type.charAt(0).toUpperCase() + referrerData.user_type.slice(1)}
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600 flex items-center gap-1">
              <Users className="w-3 h-3" />
              Your referrer
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferrerInfo;