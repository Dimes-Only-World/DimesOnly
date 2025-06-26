import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, DollarSign, Users, Crown } from 'lucide-react';

const JackpotBreakdown: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Tips Breakdown Header */}
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold flex items-center justify-center gap-2">
            <Trophy className="w-6 h-6" />
            Tips Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-lg">How your tips to win the jackpot system</p>
        </CardContent>
      </Card>

      {/* Winning Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-500" />
            Winning Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h4 className="font-semibold text-yellow-800 mb-2">1st Place Winner</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-2xl text-yellow-600">Max $250,000</div>
                  <div className="text-gray-600">Starts at $1,000</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-green-600">$30 - $7,500</div>
                  <div className="text-gray-600">Referrer Pay</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-green-600">$20 - $5,000</div>
                  <div className="text-gray-600">Stripper or Exotic Pay</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-2">2nd Place Drawing # 2</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-lg text-gray-600">$500 - $10,000</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-orange-600">$1,000 - $5,000</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-gray-600">$1,000 - $5,000</div>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <h4 className="font-semibold text-orange-800 mb-2">3rd Place Drawing # 3</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-lg text-orange-600">$250 - $5,000</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-orange-600">$1,000 - $10,000</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-orange-600">$1,000 - $10,000</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tip Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            Tip Distribution Grand Prize Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <div className="font-bold text-2xl text-purple-600">3%</div>
                <div className="text-sm text-gray-600 mt-1">
                  Goes to who referred tipper
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  $30 to $7,500 range
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="font-bold text-2xl text-blue-600">2%</div>
                <div className="text-sm text-gray-600 mt-1">
                  Goes to stripper/exotic tipped
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  $20 to $5,000 range
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="font-bold text-2xl text-green-600">$250,000 Max</div>
                <div className="text-sm text-gray-600 mt-1">
                  Goes to winning ticket
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Min. jackpot prize $1k
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            2nd Place Prize Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <div className="font-bold text-2xl text-purple-600">$500 to $10k</div>
                <div className="text-sm text-gray-600 mt-1">
                  Goes to who referred tipper
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  $15.00 to if Max $5k Deducted from Grand Prize
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="font-bold text-2xl text-blue-600">$10.00 - $5k</div>
                <div className="text-sm text-gray-600 mt-1">
                  Goes to stripper/exotic tipped
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  $10 to if Max $5k Deducted from Grand Prize
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="font-bold text-2xl text-green-600">$5,000 Max</div>
                <div className="text-sm text-gray-600 mt-1">
                  Goes to winning ticket
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  2nd Place $500 Min prize
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            3rd Place Winner Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <div className="font-bold text-2xl text-purple-600">$7.50 to $10k</div>
                <div className="text-sm text-gray-600 mt-1">
                  Goes to you if you referred tipper
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  $7.50 to if Max $10k Deducted from Grand Prize
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="font-bold text-2xl text-blue-600">$5.00 to $10k</div>
                <div className="text-sm text-gray-600 mt-1">
                  Goes to stripper/exotic username
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  $5.00 to if Max $10k Deducted from Grand Prize
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="font-bold text-2xl text-green-600">$5,000 Max</div>
                <div className="text-sm text-gray-600 mt-1">
                  Goes to winning ticket
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  3rd Place $250 Min prize
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Structure */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            Payment Structure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-semibold text-green-700 flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-800">PAID</Badge>
                  Members
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Referrer:</span>
                    <span className="font-medium">20% upfront</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Override:</span>
                    <span className="font-medium">10%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Strippers/Exotics tipped:</span>
                    <span className="font-medium">10%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-blue-700 flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-800">FREE</Badge>
                  Members
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>General:</span>
                    <span className="font-medium">10%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Referred & tipped:</span>
                    <span className="font-medium">30% upfront</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JackpotBreakdown;