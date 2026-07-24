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
                  <div className="font-bold text-lg text-orange-600">Who referred the Tipper?</div>
                  <div className="text-gray-600">Get 3 Chances to Win</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-orange-600">Dimes tip yourself!</div>
                  <div className="text-gray-600">Solidify 3 ways to win!</div>
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
                  GUARANTEED WINNERS IF MAX REACHED
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
      <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-background via-background to-primary/5">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-bold tracking-tight">Payment Structure</div>
              <p className="text-xs font-normal text-muted-foreground mt-0.5">
                Referral & override commission breakdown
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PAID Tier */}
            <div className="relative rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent p-5 transition-shadow hover:shadow-lg hover:shadow-emerald-500/10">
              <div className="absolute -top-3 left-5">
                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white shadow-md px-3 py-1 text-xs font-bold tracking-wider">
                  PAID MEMBERS
                </Badge>
              </div>
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-background/60 px-3 py-2.5 border border-border/50">
                  <span className="text-sm text-muted-foreground">Referrer</span>
                  <span className="font-bold text-emerald-600 tabular-nums">20% <span className="text-xs font-medium text-muted-foreground">Upfront</span></span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-background/60 px-3 py-2.5 border border-border/50">
                  <span className="text-sm text-muted-foreground">Override</span>
                  <span className="font-bold text-emerald-600 tabular-nums">10%</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-background/60 px-3 py-2.5 border border-border/50">
                  <span className="text-sm text-muted-foreground pr-2">Tipped User</span>
                  <span className="font-bold text-emerald-600 tabular-nums">30%</span>
                </div>
              </div>
            </div>

            {/* FREE Tier */}
            <div className="relative rounded-xl border border-sky-500/30 bg-gradient-to-br from-sky-500/5 to-transparent p-5 transition-shadow hover:shadow-lg hover:shadow-sky-500/10">
              <div className="absolute -top-3 left-5">
                <Badge className="bg-sky-600 hover:bg-sky-600 text-white shadow-md px-3 py-1 text-xs font-bold tracking-wider">
                  FREE MEMBERS
                </Badge>
              </div>
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-background/60 px-3 py-2.5 border border-border/50">
                  <span className="text-sm text-muted-foreground">Referrer</span>
                  <span className="font-bold text-sky-600 tabular-nums">10%</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-background/60 px-3 py-2.5 border border-border/50">
                  <span className="text-sm text-muted-foreground pr-2">Tipped User</span>
                  <span className="font-bold text-sky-600 tabular-nums">20% <span className="text-xs font-medium text-muted-foreground">Upfront</span></span>
                </div>
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
                  <div className="flex items-center gap-2 text-destructive font-bold text-sm">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-destructive" />
                    NO OVERRIDES
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    Upgrade to <span className="font-semibold text-foreground">Silver ($4.99/mo)</span> minimum to unlock overrides.
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground italic text-center">
                All Dimes who started early are paid members
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JackpotBreakdown;
