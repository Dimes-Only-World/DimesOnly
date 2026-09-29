import { useMembershipStage } from "@/hooks/useMembershipStage";
import { formatUSD, type PlusType } from "@/lib/membershipPricing";

export default function StagePriceBanner({ type, className = "" }: { type: PlusType; className?: string }) {
  const s = useMembershipStage(type);
  if (s.loading) return null;
  if (s.soldOut || !s.stage) {
    return (
      <div className={`rounded-xl border-2 border-primary bg-background/80 p-4 text-center ${className}`}>
        <p className="text-2xl font-black tracking-wide text-primary">POSITIONS ARE FILLED</p>
        <p className="text-lg font-bold text-foreground">APP RELEASE SOON</p>
      </div>
    );
  }
  return (
    <div className={`rounded-xl border-2 border-primary bg-background/80 p-4 text-center ${className}`}>
      <p className="text-xl font-black text-primary">
        Only {s.remainingInStage} Spots Left at {formatUSD(s.stage.full)}
      </p>
      {s.next ? (
        <p className="text-sm font-semibold text-foreground">
          Next {formatUSD(s.next.full)} for the next {s.next.size}
        </p>
      ) : (
        <p className="text-sm font-semibold text-foreground">Final price stage</p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">
        {s.remainingOverall} of {s.totalSeats} total positions left
      </p>
    </div>
  );
}
