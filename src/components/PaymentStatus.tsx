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

  if (!isEligible) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Payment Program Eligibility
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The Quarterly Payment Program is available for strippers and exotic dancers only.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Program Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            Quarterly Payment Program
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">For Strippers and Exotic Dancers</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Our first 1,000 female strippers and exotic dancers can earn a guaranteed $6,250 every 3 months 
              ($25,000 annually) once we reach 1,000 female strippers/exotics and 3,000 male, female, or non-performer users.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">${basePayment.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Quarterly Base</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">${netPayment.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Net Payment</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Referrals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>This Week</span>
                <span>{weeklyProgress.referrals}/7</span>
              </div>
              <Progress value={(weeklyProgress.referrals / 7) * 100} className="h-2" />
              <div className="flex justify-between text-sm">
                <span>Quarterly</span>
                <span>{quarterlyProgress.totalReferrals}/84</span>
              </div>
              <Progress value={(quarterlyProgress.totalReferrals / 84) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Photos/Week</span>
                <span>{weeklyProgress.photos}/7</span>
              </div>
              <Progress value={(weeklyProgress.photos / 7) * 100} className="h-2" />
              <div className="flex justify-between text-sm">
                <span>Videos/Week</span>
                <span>{weeklyProgress.videos}/7</span>
              </div>
              <Progress value={(weeklyProgress.videos / 7) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>This Week</span>
                <span>{weeklyProgress.messages}/7</span>
              </div>
              <Progress value={(weeklyProgress.messages / 7) * 100} className="h-2" />
              <div className="flex justify-between text-sm">
                <span>Quarterly</span>
                <span>{quarterlyProgress.totalMessages}/84</span>
              </div>
              <Progress value={(quarterlyProgress.totalMessages / 84) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deductions Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Deductions Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium">Weekly Deductions</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Missed Referrals</span>
                  <Badge variant="destructive">
                    ${((7 - weeklyProgress.referrals) * 14.14).toFixed(2)}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Missed Photos</span>
                  <Badge variant="destructive">
                    ${((7 - weeklyProgress.photos) * 14.14).toFixed(2)}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Missed Videos</span>
                  <Badge variant="destructive">
                    ${((7 - weeklyProgress.videos) * 14.14).toFixed(2)}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Missed Messages</span>
                  <Badge variant="destructive">
                    ${((7 - weeklyProgress.messages) * 14.14).toFixed(2)}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium">Monthly Deductions</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Missed Events</span>
                  <Badge variant="destructive">
                    ${((1 - monthlyProgress.events) * 500).toFixed(2)}
                  </Badge>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <div className="flex justify-between font-medium">
                  <span>Total Deductions</span>
                  <Badge variant="destructive">
                    ${deductions.total.toFixed(2)}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentStatus;