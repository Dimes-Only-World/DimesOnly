import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreditCard, Lock, Shield, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreditCardFormProps {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cardHolderName: string;
  onCardNumberChange: (value: string) => void;
  onExpiryMonthChange: (value: string) => void;
  onExpiryYearChange: (value: string) => void;
  onCvvChange: (value: string) => void;
  onCardHolderNameChange: (value: string) => void;
  amount: number;
  onSubmit: () => void;
  isSubmitting: boolean;
}

// Card brand detection based on card number prefix
const detectCardBrand = (cardNumber: string): string => {
  const cleanNumber = cardNumber.replace(/\s/g, "");
  
  if (/^4/.test(cleanNumber)) return "visa";
  if (/^5[1-5]/.test(cleanNumber) || /^2[2-7]/.test(cleanNumber)) return "mastercard";
  if (/^3[47]/.test(cleanNumber)) return "amex";
  if (/^6(?:011|5)/.test(cleanNumber)) return "discover";
  if (/^35/.test(cleanNumber)) return "jcb";
  if (/^3(?:0[0-5]|[68])/.test(cleanNumber)) return "diners";
  
  return "unknown";
};

// Format card number with spaces
const formatCardNumber = (value: string): string => {
  const cleanValue = value.replace(/\D/g, "");
  const brand = detectCardBrand(cleanValue);
  
  // Amex: 4-6-5 format
  if (brand === "amex") {
    const part1 = cleanValue.slice(0, 4);
    const part2 = cleanValue.slice(4, 10);
    const part3 = cleanValue.slice(10, 15);
    return [part1, part2, part3].filter(Boolean).join(" ");
  }
  
  // Default: 4-4-4-4 format
  const groups = cleanValue.match(/.{1,4}/g);
  return groups ? groups.join(" ") : cleanValue;
};

// Validate card number using Luhn algorithm
const validateCardNumber = (cardNumber: string): boolean => {
  const cleanNumber = cardNumber.replace(/\s/g, "");
  if (!/^\d{13,19}$/.test(cleanNumber)) return false;
  
  let sum = 0;
  let isEven = false;
  
  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber[i], 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
};

// Card brand icons as SVG components
const CardBrandIcon: React.FC<{ brand: string; className?: string }> = ({ brand, className }) => {
  const baseClass = cn("transition-all duration-200", className);
  
  switch (brand) {
    case "visa":
      return (
        <div className={cn(baseClass, "bg-gradient-to-r from-blue-600 to-blue-700 text-white px-2 py-1 rounded text-xs font-bold")}>
          VISA
        </div>
      );
    case "mastercard":
      return (
        <div className={cn(baseClass, "flex items-center")}>
          <div className="w-5 h-5 bg-red-500 rounded-full -mr-2"></div>
          <div className="w-5 h-5 bg-yellow-500 rounded-full opacity-90"></div>
        </div>
      );
    case "amex":
      return (
        <div className={cn(baseClass, "bg-gradient-to-r from-blue-400 to-blue-600 text-white px-1.5 py-1 rounded text-[10px] font-bold")}>
          AMEX
        </div>
      );
    case "discover":
      return (
        <div className={cn(baseClass, "bg-gradient-to-r from-orange-400 to-orange-600 text-white px-1.5 py-1 rounded text-[10px] font-bold")}>
          DISCOVER
        </div>
      );
    default:
      return (
        <CreditCard className={cn(baseClass, "w-6 h-6 text-muted-foreground")} />
      );
  }
};

// Card preview component
const CardPreview: React.FC<{
  cardNumber: string;
  cardHolderName: string;
  expiryMonth: string;
  expiryYear: string;
  brand: string;
}> = ({ cardNumber, cardHolderName, expiryMonth, expiryYear, brand }) => {
  const displayNumber = cardNumber || "•••• •••• •••• ••••";
  const displayName = cardHolderName || "YOUR NAME";
  const displayExpiry = expiryMonth && expiryYear 
    ? `${expiryMonth}/${expiryYear.slice(-2)}` 
    : "MM/YY";

  return (
    <div className="relative w-full h-44 sm:h-48 rounded-2xl overflow-hidden perspective-1000 group">
      <div className={cn(
        "absolute inset-0 rounded-2xl p-5 sm:p-6 flex flex-col justify-between text-white shadow-2xl transition-all duration-500",
        brand === "visa" && "bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800",
        brand === "mastercard" && "bg-gradient-to-br from-gray-800 via-gray-900 to-black",
        brand === "amex" && "bg-gradient-to-br from-blue-400 via-blue-500 to-blue-700",
        brand === "discover" && "bg-gradient-to-br from-orange-400 via-orange-500 to-orange-700",
        brand === "unknown" && "bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800"
      )}>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
        
        {/* Card top row */}
        <div className="flex justify-between items-start relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-10 h-7 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-md shadow-inner flex items-center justify-center">
              <div className="w-6 h-4 bg-gradient-to-r from-yellow-400/50 to-yellow-300/50 rounded-sm"></div>
            </div>
            <div className="w-5 h-5 border-2 border-white/30 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white/50 rounded-full animate-pulse"></div>
            </div>
          </div>
          <CardBrandIcon brand={brand} className="scale-125" />
        </div>
        
        {/* Card number */}
        <div className="relative z-10 mt-4 sm:mt-6">
          <div className="font-mono text-lg sm:text-xl tracking-[0.2em] text-white/90">
            {displayNumber}
          </div>
        </div>
        
        {/* Card bottom row */}
        <div className="flex justify-between items-end relative z-10">
          <div>
            <div className="text-[10px] text-white/60 uppercase tracking-wider mb-0.5">Card Holder</div>
            <div className="font-medium text-sm uppercase tracking-wider truncate max-w-[180px]">
              {displayName}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-white/60 uppercase tracking-wider mb-0.5">Expires</div>
            <div className="font-mono text-sm">{displayExpiry}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Validation indicator component
const ValidationIndicator: React.FC<{ isValid: boolean | null; message?: string }> = ({ isValid, message }) => {
  if (isValid === null) return null;
  
  return (
    <div className={cn(
      "flex items-center gap-1.5 text-xs mt-1 transition-all duration-200",
      isValid ? "text-green-600" : "text-red-500"
    )}>
      {isValid ? (
        <Check className="w-3.5 h-3.5" />
      ) : (
        <AlertCircle className="w-3.5 h-3.5" />
      )}
      <span>{message}</span>
    </div>
  );
};

const CreditCardForm: React.FC<CreditCardFormProps> = ({
  cardNumber,
  expiryMonth,
  expiryYear,
  cvv,
  cardHolderName,
  onCardNumberChange,
  onExpiryMonthChange,
  onExpiryYearChange,
  onCvvChange,
  onCardHolderNameChange,
  amount,
  onSubmit,
  isSubmitting,
}) => {
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  const cardBrand = useMemo(() => detectCardBrand(cardNumber), [cardNumber]);
  
  const cardNumberValid = useMemo(() => {
    const cleanNumber = cardNumber.replace(/\s/g, "");
    if (cleanNumber.length < 13) return null;
    return validateCardNumber(cardNumber);
  }, [cardNumber]);
  
  const cvvValid = useMemo(() => {
    if (!cvv) return null;
    const expectedLength = cardBrand === "amex" ? 4 : 3;
    return cvv.length === expectedLength;
  }, [cvv, cardBrand]);
  
  const expiryValid = useMemo(() => {
    if (!expiryMonth || !expiryYear) return null;
    const now = new Date();
    const expiry = new Date(parseInt(expiryYear), parseInt(expiryMonth) - 1);
    return expiry > now;
  }, [expiryMonth, expiryYear]);
  
  const nameValid = useMemo(() => {
    if (!cardHolderName) return null;
    return cardHolderName.trim().length >= 2 && /^[a-zA-Z\s]+$/.test(cardHolderName);
  }, [cardHolderName]);
  
  const isFormValid = cardNumberValid === true && cvvValid === true && expiryValid === true && nameValid === true;
  
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    const maxLength = cardBrand === "amex" ? 15 : 16;
    const truncated = rawValue.slice(0, maxLength);
    const formatted = formatCardNumber(truncated);
    onCardNumberChange(formatted);
  };
  
  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    const maxLength = cardBrand === "amex" ? 4 : 3;
    onCvvChange(rawValue.slice(0, maxLength));
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
    onCardHolderNameChange(value);
  };

  return (
    <div className="space-y-6">
      {/* Card Preview */}
      <CardPreview
        cardNumber={cardNumber}
        cardHolderName={cardHolderName}
        expiryMonth={expiryMonth}
        expiryYear={expiryYear}
        brand={cardBrand}
      />
      
      {/* Card Form */}
      <div className="space-y-4 bg-gradient-to-b from-slate-50 to-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
        {/* Card Number */}
        <div className="space-y-1.5">
          <Label htmlFor="cardNumber" className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Card Number
          </Label>
          <div className="relative">
            <Input
              id="cardNumber"
              value={cardNumber}
              onChange={handleCardNumberChange}
              onFocus={() => setFocusedField("cardNumber")}
              onBlur={() => setFocusedField(null)}
              placeholder="1234 5678 9012 3456"
              className={cn(
                "font-mono text-lg tracking-wider pl-4 pr-12 h-12 transition-all duration-200",
                focusedField === "cardNumber" && "ring-2 ring-pink-500 border-pink-500",
                cardNumberValid === true && "border-green-500",
                cardNumberValid === false && "border-red-500"
              )}
              autoComplete="cc-number"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <CardBrandIcon brand={cardBrand} />
            </div>
          </div>
          <ValidationIndicator 
            isValid={cardNumberValid} 
            message={cardNumberValid ? "Valid card number" : "Invalid card number"}
          />
        </div>
        
        {/* Expiry and CVV Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Month</Label>
            <Select value={expiryMonth} onValueChange={onExpiryMonthChange}>
              <SelectTrigger className={cn(
                "h-12",
                expiryValid === true && "border-green-500",
                expiryValid === false && "border-red-500"
              )}>
                <SelectValue placeholder="MM" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <SelectItem key={month} value={month.toString().padStart(2, "0")}>
                    {month.toString().padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Year</Label>
            <Select value={expiryYear} onValueChange={onExpiryYearChange}>
              <SelectTrigger className={cn(
                "h-12",
                expiryValid === true && "border-green-500",
                expiryValid === false && "border-red-500"
              )}>
                <SelectValue placeholder="YYYY" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="cvv" className="text-sm font-medium text-slate-700 flex items-center gap-1">
              CVV
              <Lock className="w-3 h-3 text-slate-400" />
            </Label>
            <Input
              id="cvv"
              type="password"
              value={cvv}
              onChange={handleCvvChange}
              onFocus={() => setFocusedField("cvv")}
              onBlur={() => setFocusedField(null)}
              placeholder={cardBrand === "amex" ? "••••" : "•••"}
              className={cn(
                "font-mono text-center h-12 tracking-widest",
                focusedField === "cvv" && "ring-2 ring-pink-500 border-pink-500",
                cvvValid === true && "border-green-500",
                cvvValid === false && "border-red-500"
              )}
              autoComplete="cc-csc"
            />
          </div>
        </div>
        <div className="col-span-3">
          <ValidationIndicator 
            isValid={expiryValid} 
            message={expiryValid ? "Valid expiry date" : "Card has expired"}
          />
        </div>
        
        {/* Cardholder Name */}
        <div className="space-y-1.5">
          <Label htmlFor="cardHolderName" className="text-sm font-medium text-slate-700">
            Cardholder Name
          </Label>
          <Input
            id="cardHolderName"
            value={cardHolderName}
            onChange={handleNameChange}
            onFocus={() => setFocusedField("cardHolderName")}
            onBlur={() => setFocusedField(null)}
            placeholder="JOHN DOE"
            className={cn(
              "uppercase h-12 tracking-wide",
              focusedField === "cardHolderName" && "ring-2 ring-pink-500 border-pink-500",
              nameValid === true && "border-green-500",
              nameValid === false && "border-red-500"
            )}
            autoComplete="cc-name"
          />
          <ValidationIndicator 
            isValid={nameValid} 
            message={nameValid ? "Valid name" : "Enter your name as shown on card"}
          />
        </div>
      </div>
      
      {/* Security Badge */}
      <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
        <Shield className="w-4 h-4 text-green-600" />
        <span>256-bit SSL Encrypted</span>
        <Lock className="w-4 h-4 text-green-600" />
        <span>Secure Payment</span>
      </div>
      
      {/* Submit Button - Prominent and Always Visible */}
      <Button
        onClick={onSubmit}
        disabled={!isFormValid || isSubmitting}
        className={cn(
          "w-full h-14 text-lg font-bold rounded-xl shadow-lg transition-all duration-300",
          isFormValid
            ? "bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-700 hover:via-purple-700 hover:to-indigo-700 text-white shadow-pink-500/30"
            : "bg-slate-300 text-slate-500 cursor-not-allowed"
        )}
      >
        {isSubmitting ? (
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            <span>Processing Payment...</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5" />
            <span>Pay ${amount.toFixed(2)} Securely</span>
            <CreditCard className="w-5 h-5" />
          </div>
        )}
      </Button>
      
      {/* Accepted Cards */}
      <div className="flex items-center justify-center gap-3 opacity-60">
        <CardBrandIcon brand="visa" />
        <CardBrandIcon brand="mastercard" />
        <CardBrandIcon brand="amex" />
        <CardBrandIcon brand="discover" />
      </div>
    </div>
  );
};

export default CreditCardForm;
