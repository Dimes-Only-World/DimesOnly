import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, TrendingUp, DollarSign, ArrowLeft } from 'lucide-react';

interface WeeklyEarning {
  weekStart: string;
  weekEnd: string;
  referralEarnings: number;
  tipEarnings: number;
  bonusEarnings: number;
  totalEarnings: number;
}

interface WeeklyEarningsHistoryProps {
  onBack: () => void;
}

const WeeklyEarningsHistory: React.FC<WeeklyEarningsHistoryProps> = ({ onBack }) => {
  // Mock historical data - in real app, fetch from database
  const weeklyHistory: WeeklyEarning[] = [
    {
      weekStart: '2024-01-15',
      weekEnd: '2024-01-21',
      referralEarnings: 150.00,
      tipEarnings: 75.00,
      bonusEarnings: 25.00,
      totalEarnings: 250.00
    },
    {
      weekStart: '2024-01-08',
      weekEnd: '2024-01-14',
      referralEarnings: 120.00,
      tipEarnings: 60.00,
      bonusEarnings: 20.00,
      totalEarnings: 200.00
    },
    {
      weekStart: '2024-01-01',
      weekEnd: '2024-01-07',
      referralEarnings: 180.00,
      tipEarnings: 90.00,
      bonusEarnings: 30.00,
      totalEarnings: 300.00
    },
    {
      weekStart: '2023-12-25',
      weekEnd: '2023-12-31',
      referralEarnings: 200.00,
      tipEarnings: 100.00,
      bonusEarnings: 50.00,
      totalEarnings: 350.00
    }
  ];

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
  };

  const totalHistoricalEarnings = weeklyHistory.reduce((sum, week) => sum + week.totalEarnings, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button onClick={onBack} variant="outline" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Earnings
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Weekly Earnings History</h2>
          <p className="text-gray-600">View your past earnings performance</p>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Total Historical Earnings</h3>
                <p className="text-gray-600">Last {weeklyHistory.length} weeks</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">
                ${totalHistoricalEarnings.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">
                Average: ${(totalHistoricalEarnings / weeklyHistory.length).toFixed(2)}/week
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly History */}
      <div className="space-y-4">
        {weeklyHistory.map((week, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  {formatDateRange(week.weekStart, week.weekEnd)}
                </CardTitle>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    ${week.totalEarnings.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">Total Earned</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Referral Earnings</span>
                  </div>
                  <div className="text-xl font-bold text-blue-600">
                    ${week.referralEarnings.toFixed(2)}
                  </div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-800">Tip Earnings</span>
                  </div>
                  <div className="text-xl font-bold text-green-600">
                    ${week.tipEarnings.toFixed(2)}
                  </div>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-purple-600" />
                    <span className="font-medium text-purple-800">Bonus Earnings</span>
                  </div>
                  <div className="text-xl font-bold text-purple-600">
                    ${week.bonusEarnings.toFixed(2)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default WeeklyEarningsHistory;