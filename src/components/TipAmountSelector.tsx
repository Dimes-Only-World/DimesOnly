import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';

interface TipAmountSelectorProps {
  selectedAmount: number;
  onAmountChange: (amount: number) => void;
  customAmount: string;
  onCustomAmountChange: (amount: string) => void;
}

const TipAmountSelector: React.FC<TipAmountSelectorProps> = ({
  selectedAmount,
  onAmountChange,
  customAmount,
  onCustomAmountChange
}) => {
  const presetAmounts = [5, 10, 20, 50, 100, 200];

  const handleCustomAmountChange = (value: string) => {
    // Only allow numbers and decimal point
    const sanitized = value.replace(/[^0-9.]/g, '');
    onCustomAmountChange(sanitized);
    
    const numValue = parseFloat(sanitized);
    if (!isNaN(numValue) && numValue > 0) {
      onAmountChange(numValue);
    }
  };

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-green-400" />
          <h3 className="text-lg font-semibold text-white">Select Tip Amount</h3>
        </div>
        
        {/* Preset amounts */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {presetAmounts.map((amount) => (
            <Button
              key={amount}
              variant={selectedAmount === amount ? "default" : "outline"}
              onClick={() => {
                onAmountChange(amount);
                onCustomAmountChange('');
              }}
              className={`h-12 text-lg font-semibold ${
                selectedAmount === amount
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
              }`}
            >
              ${amount}
            </Button>
          ))}
        </div>
        
        {/* Custom amount */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">
            Or enter custom amount:
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="0.00"
              value={customAmount}
              onChange={(e) => handleCustomAmountChange(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-green-500"
            />
          </div>
        </div>
        
        {selectedAmount > 0 && (
          <div className="mt-4 p-3 bg-green-900/20 border border-green-700 rounded-lg">
            <p className="text-green-400 text-sm">
              You're about to tip <span className="font-bold">${selectedAmount.toFixed(2)}</span>
            </p>
            <p className="text-green-300 text-xs mt-1">
              This will generate {selectedAmount} lottery tickets
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TipAmountSelector;