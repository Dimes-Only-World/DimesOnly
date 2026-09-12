import React from "react";
import { Input } from "@/components/ui/input";
import { DollarSign, Ticket } from "lucide-react";

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
  onCustomAmountChange,
}) => {
  const MIN_TIP = 5;
  const MAX_TIP = 1000;
  const presetAmounts = [5, 10, 20, 50, 100, 200];

  const handleCustomAmountChange = (value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, "");
    onCustomAmountChange(sanitized);

    const numericValue = parseFloat(sanitized);

    if (!isNaN(numericValue) && numericValue >= MIN_TIP && numericValue <= MAX_TIP) {
      onAmountChange(numericValue);
    } else if (!isNaN(numericValue) && numericValue > MAX_TIP) {
      onAmountChange(MAX_TIP);
    } else {
      onAmountChange(0);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0B0611]/80 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-[#FF5FD1]" />
          <h3 className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-200">
            Choose Amount
          </h3>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-slate-500">
          ${MIN_TIP} min · ${MAX_TIP} max
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {presetAmounts.map((amount) => {
          const active = selectedAmount === amount;
          return (
            <button
              key={amount}
              type="button"
              onClick={() => {
                onAmountChange(amount);
                onCustomAmountChange("");
              }}
              className={`h-12 rounded-xl border text-base font-bold transition-all duration-200 ${
                active
                  ? "border-[#E916D1] bg-gradient-to-br from-[#E916D1] to-[#FF5FD1] text-white shadow-[0_0_25px_-8px_rgba(233,22,209,0.9)]"
                  : "border-white/10 bg-white/5 text-slate-200 hover:border-[#E916D1]/50 hover:bg-[#E916D1]/10"
              }`}
            >
              ${amount}
            </button>
          );
        })}
      </div>

      <div className="mt-4 space-y-2">
        <label className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
          Or enter a custom amount
        </label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={customAmount}
            onChange={(e) => handleCustomAmountChange(e.target.value)}
            className="h-12 border-white/15 bg-slate-900/60 pl-10 text-white placeholder:text-slate-500 focus-visible:ring-[#E916D1]"
          />
        </div>
      </div>

      {selectedAmount >= MIN_TIP && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-[#E916D1]/30 bg-[#E916D1]/10 px-4 py-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-300">Tip total</div>
            <div className="text-xl font-black text-white">
              ${selectedAmount.toFixed(2)}
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-yellow-400/40 bg-yellow-400/10 px-3 py-1.5">
            <Ticket className="h-3.5 w-3.5 text-yellow-300" />
            <span className="text-xs font-bold text-yellow-200">
              {Math.floor(selectedAmount)} entries
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TipAmountSelector;
