import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, DollarSign, Users, Crown, Medal, Award, Sparkles, Gift, Target } from 'lucide-react';

type Row = {
  amount: string;
  label: string;
  sub?: string;
  accent?: 'gold' | 'silver' | 'bronze' | 'primary';
};

const accentMap: Record<NonNullable<Row['accent']>, { text: string; ring: string; chip: string }> = {
  gold: {
    text: 'text-amber-500',
    ring: 'border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent',
    chip: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  },
  silver: {
    text: 'text-slate-300',
    ring: 'border-slate-400/30 bg-gradient-to-br from-slate-400/10 to-transparent',
    chip: 'bg-slate-400/15 text-slate-300 border-slate-400/30',
  },
  bronze: {
    text: 'text-orange-500',
    ring: 'border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-transparent',
    chip: 'bg-orange-500/15 text-orange-600 border-orange-500/30',
  },
  primary: {
    text: 'text-primary',
    ring: 'border-primary/30 bg-gradient-to-br from-primary/10 to-transparent',
    chip: 'bg-primary/15 text-primary border-primary/30',
  },
};

const StatTile: React.FC<{ row: Row }> = ({ row }) => {
  const a = accentMap[row.accent ?? 'primary'];
  return (
    <div className={`relative rounded-xl border ${a.ring} p-4 transition-shadow hover:shadow-lg`}>
      <div className={`text-lg md:text-xl font-black tabular-nums ${a.text} leading-tight`}>
        {row.amount}
      </div>
      <div className="mt-1 text-sm font-semibold text-foreground">{row.label}</div>
      {row.sub && <div className="mt-1 text-xs text-muted-foreground">{row.sub}</div>}
    </div>
  );
};

const PlaceHeader: React.FC<{
  icon: React.ReactNode;
  place: string;
  winners: string;
  accent: NonNullable<Row['accent']>;
}> = ({ icon, place, winners, accent }) => {
  const a = accentMap[accent];
  return (
    <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${a.chip}`}>
          {icon}
        </div>
        <div>
          <div className="text-base md:text-lg font-bold tracking-tight">{place}</div>
          <div className="text-xs text-muted-foreground">{winners}</div>
        </div>
      </div>
      <Badge variant="outline" className={`${a.chip} font-semibold tracking-wider text-[10px]`}>
        JACKPOT TIER
      </Badge>
    </div>
  );
};

const JackpotBreakdown: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-background via-background to-primary/5">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight">Tips Breakdown</div>
              <p className="text-xs font-normal text-muted-foreground mt-0.5">
                How your tips can win the jackpot system
              </p>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Winning Distribution */}
      <Card>
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
              <Crown className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="font-bold tracking-tight">Winning Distribution</div>
              <p className="text-xs font-normal text-muted-foreground mt-0.5">
                Three drawings, multiple winners each round
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* 1st Place */}
          <div>
            <PlaceHeader
              icon={<Trophy className="w-5 h-5 text-amber-500" />}
              place="1st Place Winner"
              winners="3 Winners"
              accent="gold"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <StatTile row={{ amount: 'Max $1,973,400', label: 'Tipper', accent: 'gold' }} />
              <StatTile row={{ amount: '$234.33 – $148,005.17', label: 'Dime Tipped', accent: 'gold' }} />
              <StatTile row={{ amount: '$117.17 – $74,002.50', label: 'Dime Referred By', accent: 'gold' }} />
            </div>
          </div>

          {/* 2nd Place */}
          <div>
            <PlaceHeader
              icon={<Medal className="w-5 h-5 text-slate-300" />}
              place="2nd Place Drawing"
              winners="2 Winners"
              accent="silver"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <StatTile row={{ amount: '$62.49 – $110,510.40', label: 'Dime', accent: 'silver' }} />
              <StatTile row={{ amount: '$15.62 – $27,627.60', label: 'Dime Referred By', accent: 'silver' }} />
              <StatTile row={{ amount: '2 Chances to Win', label: 'Dimes & Dime Referred By', accent: 'silver' }} />
            </div>
          </div>

          {/* 3rd Place */}
          <div>
            <PlaceHeader
              icon={<Award className="w-5 h-5 text-orange-500" />}
              place="3rd Place Drawing"
              winners="3 Winners"
              accent="bronze"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <StatTile row={{ amount: '$31.24 – $55,255.20', label: 'Who Referred Tipper', accent: 'bronze' }} />
              <StatTile row={{ amount: '3 Chances to Win', label: 'Who Referred the Tipper?', accent: 'bronze' }} />
              <StatTile row={{ amount: 'Tip Yourself!', label: 'Solidify 3 Ways to Win', accent: 'bronze' }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grand Prize */}
      <Card>
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
              <DollarSign className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <div className="font-bold tracking-tight">Grand Prize Breakdown</div>
              <p className="text-xs font-normal text-muted-foreground mt-0.5">
                1st Place tip distribution
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-5">
              <Badge className="mb-3 bg-primary/15 text-primary border-primary/30 hover:bg-primary/15" variant="outline">
                Referrer Share
              </Badge>
              <div className="text-3xl font-black text-primary tabular-nums">3.75%</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">of Grand Prize</div>
              <div className="mt-3 text-sm font-semibold">Goes to who referred Dime</div>
              <div className="mt-1 text-xs text-muted-foreground tabular-nums">$117.17 – $74,002.50 max</div>
            </div>
            <div className="relative rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent p-5">
              <Badge className="mb-3 bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/15" variant="outline">
                Dime Share
              </Badge>
              <div className="text-3xl font-black text-emerald-600 tabular-nums">7.5%</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">of Grand Prize</div>
              <div className="mt-3 text-sm font-semibold">Goes to the Dime tipped</div>
              <div className="mt-1 text-xs text-muted-foreground tabular-nums">$234.33 – $148,005 max</div>
            </div>
            <div className="relative rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-500/15 to-transparent p-5">
              <Badge className="mb-3 bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/15" variant="outline">
                Tipper Jackpot
              </Badge>
              <div className="text-3xl font-black text-amber-600 tabular-nums">$1,973,400</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Maximum Payout</div>
              <div className="mt-3 text-sm font-semibold">Goes to winning tipper</div>
              <div className="mt-1 text-xs text-muted-foreground">Min. jackpot prize $1,000</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2nd Place */}
      <Card>
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-400/15">
              <Medal className="w-5 h-5 text-slate-300" />
            </div>
            <div>
              <div className="font-bold tracking-tight">2nd Place Prize Breakdown</div>
              <p className="text-xs font-normal text-muted-foreground mt-0.5">
                Includes company bonuses at max payout
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-400/30 bg-gradient-to-br from-slate-400/10 to-transparent p-5">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-slate-300" />
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Dime Payout</span>
              </div>
              <div className="text-2xl font-black text-slate-300 tabular-nums">$62.49 – $110,510.40</div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                <Gift className="w-3.5 h-3.5" />
                +$10,000 company bonus at max
              </div>
            </div>
            <div className="rounded-xl border border-slate-400/30 bg-gradient-to-br from-slate-400/10 to-transparent p-5">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-slate-300" />
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Referrer Payout</span>
              </div>
              <div className="text-2xl font-black text-slate-300 tabular-nums">$15.62 – $27,627.60</div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                <Gift className="w-3.5 h-3.5" />
                +$40,000 company bonus at max
              </div>
            </div>
            <div className="rounded-xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-transparent p-5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span className="text-xs uppercase tracking-wider text-emerald-600 font-semibold">Company Bonus</span>
              </div>
              <div className="text-2xl font-black text-emerald-600 tabular-nums">$40,000 Bonus</div>
              <div className="mt-2 text-xs text-muted-foreground">
                Max payouts reach <span className="font-semibold text-foreground tabular-nums">$150,510.40</span> & <span className="font-semibold text-foreground tabular-nums">$67,627.60</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3rd Place */}
      <Card>
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/10">
              <Award className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <div className="font-bold tracking-tight">3rd Place Winner Breakdown</div>
              <p className="text-xs font-normal text-muted-foreground mt-0.5">
                Guaranteed winners when max is reached
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-transparent p-5">
              <Badge className="mb-3 bg-orange-500/15 text-orange-600 border-orange-500/30 hover:bg-orange-500/15" variant="outline">
                Referrer Payout
              </Badge>
              <div className="text-2xl font-black text-orange-600 tabular-nums">$31.24 – $55,255.20</div>
              <div className="mt-2 text-sm font-semibold">Goes to who referred tipper</div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                Guaranteed winner if max reached
              </div>
            </div>
            <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-5">
              <Badge className="mb-3 bg-primary/15 text-primary border-primary/30 hover:bg-primary/15" variant="outline">
                Self Referral
              </Badge>
              <div className="text-2xl font-black text-primary">Did You Refer the Tipper?</div>
              <div className="mt-2 text-sm font-semibold">Tip yourself and win</div>
              <div className="mt-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                3 Chances to Win
              </div>
            </div>
            <div className="rounded-xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-transparent p-5">
              <Badge className="mb-3 bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/15" variant="outline">
                Company Bonus
              </Badge>
              <div className="text-2xl font-black text-emerald-600 tabular-nums">$10,000 Bonus</div>
              <div className="mt-2 text-sm font-semibold">Added if max is reached</div>
              <div className="mt-2 text-xs text-muted-foreground tabular-nums">
                Max payout: <span className="font-semibold text-foreground">$65,255.20</span>
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
