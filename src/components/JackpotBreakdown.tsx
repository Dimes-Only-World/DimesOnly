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
          <p className="text-lg">How your tips can win the jackpot system</p>
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
              <h4 className="font-semibold text-yellow-800 mb-2">1st Place Winner = 3 Winners</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-2xl text-yellow-600">Max $1,973,400</div>
                  <div className="text-gray-600">Tipper</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-green-600">$234.33 - $148,005.17</div>
                  <div className="text-gray-600">Dime Tipped</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-green-600">$117.17 - $74,002.50</div>
                  <div className="text-gray-600">Dime Referred By</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-2">2nd Place Drawing = 2 Winners</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-lg text-gray-600">$62.49 - $110,510.40</div>
                  <div className="text-gray-600">Dime</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-orange-600">$15.62 - $27,627.60</div>
                  <div className="text-gray-600">Dime Referred By</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-gray-600">Dimes & Dime Referred By</div>
                  <div className="text-gray-600">2 Chances to Wim</div>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <h4 className="font-semibold text-orange-800 mb-2">3rd Place Drawing # 3</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-lg text-orange-600">$31.24 - $55,255.20</div>
                  <div className="text-gray-600">Who Referred Tipper</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-orange-600">Did you refer the Tipper?</div>
                  <div className="text-gray-600">Get 3 Chances to Win</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-orange-600">Get 2 chances to win!</div>
                  <div className="text-gray-600">Who Referred Tipper</div>
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
                <div className="font-bold text-2xl text-green-600">3.75% of Grand Prize</div>
                <div className="text-sm text-gray-600 mt-1">
                  Goes to who referred Dime
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  $117.17 to $74,002.50 max range
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="font-bold text-2xl text-green-600">7.5% of Grand Prize</div>
                <div className="text-sm text-gray-600 mt-1">
                  Goes to the Dime tipped
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  $234.33 to $148,005 max range
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="font-bold text-2xl text-green-600">$1,973,400 Max</div>
                <div className="text-sm text-gray-600 mt-1">
                  Goes to winning tipper
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
                <div className="font-bold text-2xl text-green-600">$62.49 to $110,510.40</div>
                <div className="text-sm text-gray-600 mt-1">
                  Goes to Dime
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  $10,000 Bonus from company included at max
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="font-bold text-2xl text-green-600">$15.62 - $27,627.60</div>
                <div className="text-sm text-gray-600 mt-1">
                  Goes to who referred Dime
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  $40,000 Bonus from company included at max
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="font-bold text-2xl text-purple-600">$40,000 Bonus</div>
                <div className="text-sm text-gray-600 mt-1">
                  Bonus from Company add to max payouts
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  $150,510.40 & 67,627.60 max
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
                <div className="font-bold text-2xl text-green-600">$31.24 to $55,255.20</div>
                <div className="text-sm text-gray-600 mt-1">
                  Goes to who referred tipper
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  GUARANNTEED WINNERS IF MAX REACHED
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="font-bold text-2xl text-purple-600">Did you refer Tipper?</div>
                <div className="text-sm text-gray-600 mt-1">
                  Tip yourself and win
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  3 Chances to Win
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="font-bold text-2xl text-purple-600">$10,000 Bonus</div>
                <div className="text-sm text-gray-600 mt-1">
                  Bonus added if max is reached
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  $65,255.20 max
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
                    <span>Dimes referred & tipped:</span>
                    <span className="font-medium">30%</span>
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
                    <span>Referrer:</span>
                    <span className="font-medium">10%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dimes Referred & tipped:</span>
                    <span className="font-medium">20% upfront</span>
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
