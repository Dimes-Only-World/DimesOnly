import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, DollarSign, Users, Upload, Calendar, MessageSquare } from 'lucide-react';

interface PaymentStatusProps {
  userType: string;
  weeklyProgress: {
    referrals: number;
    photos: number;
    videos: number;
    messages: number;
  };
  monthlyProgress: {
    events: number;
  };
  quarterlyProgress: {
    totalReferrals: number;
    totalPhotos: number;
    totalVideos: number;
    totalMessages: number;
    totalEvents: number;
  };
  deductions: {
    weekly: number;
    monthly: number;
    total: number;
  };
}

const PaymentStatus: React.FC<PaymentStatusProps> = ({
  userType,
  weeklyProgress,
  monthlyProgress,
  quarterlyProgress,
  deductions
}) => {
  const isEligible = userType === 'stripper' || userType === 'exotic';
  const basePayment = 6250;
  const netPayment = Math.max(0, basePayment - deductions.total);

  const requirements = {
    referrals: { target: 7, quarterly: 84, deduction: 14.14 },
    photos: { target: 7, quarterly: 84, deduction: 14.14 },
    videos: { target: 7, quarterly: 84, deduction: 14.14 },
    messages: { target: 7, quarterly: 84, deduction: 14.14 },
    events: { target: 1, quarterly: 3, deduction: 500 }
  };

  return null;
};

export default PaymentStatus;