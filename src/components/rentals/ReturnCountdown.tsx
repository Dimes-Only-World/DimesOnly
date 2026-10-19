import React, { useEffect, useState } from "react";
import { Timer } from "lucide-react";

/** Live countdown to a rental's return time. */
const ReturnCountdown: React.FC<{ endIso: string }> = ({ endIso }) => {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  if (now === null) return null;
  const ms = new Date(endIso).getTime() - now;
  if (ms <= 0) return <p className="flex items-center gap-2 text-sm font-semibold text-red-400"><Timer className="h-4 w-4" /> Return time has passed</p>;
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return (
    <p className="flex items-center gap-2 text-sm font-semibold text-rental-success">
      <Timer className="h-4 w-4" /> Return in {d > 0 ? `${d}d ` : ""}{h}h {m}m
    </p>
  );
};

export default ReturnCountdown;
