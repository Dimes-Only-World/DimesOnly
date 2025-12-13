import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, User, Users, Trophy, Building, CreditCard } from 'lucide-react';

// Allocation rates - must match edge functions
const PERFORMER_RATE = 0.20;      // 20% to performer
const REFERRER_RATE = 0.10;       // 10% to referrer  
const JACKPOT_RATE = 0.25;        // 25% to jackpot
const PAYPAL_PERCENT_FEE = 0.015; // 1.5% PayPal fee
const PAYPAL_FIXED_FEE = 0.50;    // $0.50 fixed fee

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

interface AllocationResult {
  grossAmount: number;
  paypalFee: number;
  netAfterFees: number;
  performerShare: number;
  referrerShare: number;
  jackpotShare: number;
  companyShare: number;
  ticketsGenerated: number;
}

const calculateAllocation = (grossAmount: number, hasReferrer: boolean): AllocationResult => {
  const percentFee = roundCurrency(grossAmount * PAYPAL_PERCENT_FEE);
  const paypalFee = roundCurrency(percentFee + PAYPAL_FIXED_FEE);
  const netAfterFees = Math.max(0, roundCurrency(grossAmount - paypalFee));

  const performerShare = roundCurrency(netAfterFees * PERFORMER_RATE);
  const referrerShare = hasReferrer ? roundCurrency(netAfterFees * REFERRER_RATE) : 0;
  const jackpotShare = roundCurrency(netAfterFees * JACKPOT_RATE);
  let companyShare = roundCurrency(netAfterFees - performerShare - referrerShare - jackpotShare);

  // Fix rounding to ensure total = gross
  const allocatedTotal = roundCurrency(paypalFee + performerShare + referrerShare + jackpotShare + companyShare);
  const delta = roundCurrency(grossAmount - allocatedTotal);
  if (delta !== 0) {
    companyShare = roundCurrency(companyShare + delta);
  }

  return {
    grossAmount,
    paypalFee,
    netAfterFees,
    performerShare,
    referrerShare,
    jackpotShare,
    companyShare,
    ticketsGenerated: Math.floor(grossAmount),
  };
};

interface TipAllocationBreakdownProps {
  tipAmount: number;
  hasReferrer?: boolean;
  showTitle?: boolean;
  className?: string;
}

const TipAllocationBreakdown: React.FC<TipAllocationBreakdownProps> = ({
  tipAmount,
  hasReferrer = true,
  showTitle = true,
  className = '',
}) => {
  const allocation = calculateAllocation(tipAmount, hasReferrer);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number, total: number) => {
    if (total === 0) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  const allocationItems = [
    {
      label: 'Performer Earnings',
      value: allocation.performerShare,
      rate: `${(PERFORMER_RATE * 100).toFixed(0)}%`,
      icon: User,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      label: 'Referrer Commission',
      value: allocation.referrerShare,
      rate: hasReferrer ? `${(REFERRER_RATE * 100).toFixed(0)}%` : '0%',
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Jackpot Pool',
      value: allocation.jackpotShare,
      rate: `${(JACKPOT_RATE * 100).toFixed(0)}%`,
      icon: Trophy,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    },
    {
      label: 'Platform Fee',
      value: allocation.companyShare,
      rate: formatPercent(allocation.companyShare, allocation.grossAmount),
      icon: Building,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      label: 'PayPal Processing',
      value: allocation.paypalFee,
      rate: `1.5% + $0.50`,
      icon: CreditCard,
      color: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-50 dark:bg-gray-900/20',
    },
  ];

  if (tipAmount <= 0) {
    return null;
  }

  return (
    <Card className={`${className}`}>
      {showTitle && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5 text-primary" />
            Tip Allocation Breakdown
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={showTitle ? '' : 'pt-6'}>
        <div className="space-y-4">
          {/* Total Amount */}
          <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
            <span className="font-semibold">Total Tip Amount</span>
            <span className="text-xl font-bold text-primary">{formatCurrency(allocation.grossAmount)}</span>
          </div>

          {/* Allocation Items */}
          <div className="space-y-2">
            {allocationItems.map((item) => (
              <div
                key={item.label}
                className={`flex items-center justify-between p-3 rounded-lg ${item.bgColor}`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`h-4 w-4 ${item.color}`} />
                  <div>
                    <span className="font-medium text-sm">{item.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">({item.rate})</span>
                  </div>
                </div>
                <span className={`font-semibold ${item.color}`}>
                  {formatCurrency(item.value)}
                </span>
              </div>
            ))}
          </div>

          {/* Verification */}
          <div className="border-t pt-3 mt-4">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Verification Total:</span>
              <span className={
                roundCurrency(
                  allocation.performerShare +
                  allocation.referrerShare +
                  allocation.jackpotShare +
                  allocation.companyShare +
                  allocation.paypalFee
                ) === allocation.grossAmount
                  ? 'text-green-600'
                  : 'text-red-600'
              }>
                {formatCurrency(
                  allocation.performerShare +
                  allocation.referrerShare +
                  allocation.jackpotShare +
                  allocation.companyShare +
                  allocation.paypalFee
                )}
              </span>
            </div>
          </div>

          {/* Lottery Tickets */}
          {allocation.ticketsGenerated > 0 && (
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-600" />
                <span className="font-medium text-amber-800 dark:text-amber-200">Lottery Tickets Generated</span>
              </div>
              <span className="font-bold text-amber-600">
                {allocation.ticketsGenerated} ticket{allocation.ticketsGenerated !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TipAllocationBreakdown;

// Export the calculation function for use elsewhere
export { calculateAllocation, type AllocationResult };
