import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Trophy, DollarSign } from 'lucide-react';

interface JackpotCountdownProps {
  currentJackpot?: number;
  targetAmount?: number;
  nextDrawDate?: string;
}

const JackpotCountdown: React.FC<JackpotCountdownProps> = ({
  currentJackpot = 0,
  targetAmount = 1000,
  nextDrawDate
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const [showCountdown, setShowCountdown] = useState(false);

  useEffect(() => {
    const safeJackpot = Number(currentJackpot) || 0;
    const safeTarget = Number(targetAmount) || 1000;
    
    // Only show countdown if jackpot reaches target amount
    if (safeJackpot >= safeTarget && nextDrawDate) {
      setShowCountdown(true);
      
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const drawTime = new Date(nextDrawDate).getTime();
        const difference = drawTime - now;

        if (difference > 0) {
          const days = Math.floor(difference / (1000 * 60 * 60 * 24));
          const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((difference % (1000 * 60)) / 1000);

          setTimeLeft({ days, hours, minutes, seconds });
        } else {
          setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        }
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setShowCountdown(false);
    }
  }, [currentJackpot, targetAmount, nextDrawDate]);

  const safeJackpot = Number(currentJackpot) || 0;
  const safeTarget = Number(targetAmount) || 1000;

  const formatCurrency = (amount: number | null | undefined) => {
    const safeAmount = Number(amount) || 0;
    return safeAmount.toLocaleString();
  };

  return (
    <Card className="bg-gradient-to-br from-yellow-600 to-yellow-800 border-yellow-400 shadow-2xl">
      <CardHeader className="text-center pb-2">
        <CardTitle className="flex items-center justify-center gap-2 text-white text-2xl">
          <Trophy className="w-8 h-8" />
          JACKPOT
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <div className="bg-black/20 rounded-lg p-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <DollarSign className="w-6 h-6 text-green-400" />
            <span className="text-4xl font-bold text-white">
              ${formatCurrency(safeJackpot)}
            </span>
          </div>
          <p className="text-yellow-100 text-sm">
            Current Jackpot Amount
          </p>
        </div>

        {safeJackpot < safeTarget ? (
          <div className="bg-white/10 rounded-lg p-4">
            <h3 className="text-white font-bold mb-2">
              When POT Gets to ${formatCurrency(safeTarget)}
            </h3>
            <p className="text-yellow-100 text-sm mb-2">
              Countdown begins!
            </p>
            <div className="w-full bg-black/30 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-green-400 to-yellow-400 h-3 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((safeJackpot / safeTarget) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-yellow-200 mt-1">
              ${formatCurrency(safeTarget - safeJackpot)} to go
            </p>
          </div>
        ) : (
          showCountdown && (
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-red-400" />
                <h3 className="text-white font-bold">Time Until Draw</h3>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-black/30 rounded p-2">
                  <div className="text-2xl font-bold text-white">{timeLeft.days}</div>
                  <div className="text-xs text-yellow-200">Days</div>
                </div>
                <div className="bg-black/30 rounded p-2">
                  <div className="text-2xl font-bold text-white">{timeLeft.hours}</div>
                  <div className="text-xs text-yellow-200">Hours</div>
                </div>
                <div className="bg-black/30 rounded p-2">
                  <div className="text-2xl font-bold text-white">{timeLeft.minutes}</div>
                  <div className="text-xs text-yellow-200">Min</div>
                </div>
                <div className="bg-black/30 rounded p-2">
                  <div className="text-2xl font-bold text-white">{timeLeft.seconds}</div>
                  <div className="text-xs text-yellow-200">Sec</div>
                </div>
              </div>
              <p className="text-yellow-100 text-sm mt-2">
                Drawing every Friday at 6 PM
              </p>
            </div>
          )
        )}

        <div className="text-xs text-yellow-200">
          <p>💎 Every tip = lottery tickets</p>
          <p>🎯 Weekly drawings until winner</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default JackpotCountdown;