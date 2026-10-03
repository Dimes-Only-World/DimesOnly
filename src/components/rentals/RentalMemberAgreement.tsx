import { FileCheck2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LONG_TERM_MIN_MONTHS, RENT_TO_OWN_MONTHS, rentToOwnContractTotal, rentToOwnMonthlyPayment } from "@/lib/rentalTerms";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: any;
  rentalType: string;
  startDate: string;
  endDate: string;
  memberName: string;
  memberAddress?: string;
  onAccept: () => void;
};

const valueOrAdmin = (value: unknown) => value ? String(value) : "To be completed by Best Rental Car Service";
const money = (value: unknown) => `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const RentalMemberAgreement = ({ open, onOpenChange, vehicle, rentalType, startDate, endDate, memberName, memberAddress, onAccept }: Props) => {
  const isRentToOwn = rentalType === "rent_to_own";
  const monthlyPayment = isRentToOwn ? rentToOwnMonthlyPayment(vehicle?.monthly_rate) : Number(vehicle?.monthly_rate || 0);
  const term = isRentToOwn ? `${RENT_TO_OWN_MONTHS} months` : `${LONG_TERM_MIN_MONTHS} months minimum`;

  const fields = [
    ["Vehicle", `${vehicle?.year || ""} ${vehicle?.make || ""} ${vehicle?.model || ""}`.trim()],
    ["VIN", vehicle?.vin], ["Odometer", vehicle?.mileage ? `${Number(vehicle.mileage).toLocaleString()} miles` : null],
    ["Registration state", vehicle?.registration_state], ["License plate", vehicle?.license_plate],
    ["Plate expiration", vehicle?.plate_expiration], ["Body style", vehicle?.body_style], ["Color", vehicle?.color],
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-rental-line bg-rental-background p-0 text-rental-foreground">
        <div className="border-b-4 border-rental-primary bg-rental-surface px-5 py-6 sm:px-8">
          <DialogHeader>
            <p className="text-xs font-semibold uppercase text-rental-primary">Best Holdings Enterprises, Inc.</p>
            <DialogTitle className="rentals-wordmark text-4xl text-rental-foreground">BEST RENTAL CAR SERVICE</DialogTitle>
            <p className="text-sm uppercase text-rental-muted">Permissive Member Use Agreement</p>
          </DialogHeader>
        </div>
        <div className="space-y-6 px-5 pb-6 sm:px-8">
          <div className="grid gap-px border border-rental-line bg-rental-line sm:grid-cols-2">
            {fields.map(([label, value]) => (
              <div key={label} className="bg-rental-surface p-3">
                <p className="text-[10px] font-semibold uppercase text-rental-muted">{label}</p>
                <p className="mt-1 text-sm font-medium">{valueOrAdmin(value)}</p>
              </div>
            ))}
          </div>

          <section className="space-y-2">
            <h3 className="flex items-center gap-2 font-semibold"><FileCheck2 className="h-4 w-4 text-rental-primary" /> Member and term</h3>
            <p className="text-sm text-rental-muted"><b className="text-rental-foreground">Permissive member:</b> {valueOrAdmin(memberName)}</p>
            <p className="text-sm text-rental-muted"><b className="text-rental-foreground">Address:</b> {valueOrAdmin(memberAddress)}</p>
            <p className="text-sm text-rental-muted"><b className="text-rental-foreground">Use term:</b> {startDate ? new Date(startDate).toLocaleString() : "Choose a pickup date"} through {endDate ? new Date(endDate).toLocaleString() : "—"} ({term})</p>
            <p className="text-sm text-rental-muted"><b className="text-rental-foreground">Down payment:</b> {money(vehicle?.down_payment)} · <b className="text-rental-foreground">Monthly use payment:</b> {money(monthlyPayment)}</p>
            {isRentToOwn && <p className="text-sm text-rental-muted"><b className="text-rental-foreground">48-month contract total:</b> {money(rentToOwnContractTotal(vehicle?.monthly_rate, vehicle?.down_payment))}, calculated as the down payment plus 48 monthly payments at the listed monthly rate less $75 per month.</p>}
          </section>

          <section className="space-y-3 border-y border-rental-line py-5 text-sm leading-relaxed text-rental-muted">
            <p>The member accepts possession and authorized use of the vehicle, will make every payment when due, maintain required insurance naming the owner and mortgagor as additional insured or loss payee, and provide proof upon request.</p>
            <p>The member is responsible for parking tickets, registration and official fees, scheduled maintenance, repairs caused by misuse, and keeping the vehicle in good running condition. The vehicle may not be sold, transferred, concealed, used unlawfully, or removed from the state without written permission.</p>
            <p>Unless waived in writing, annual mileage is limited to 15,000 miles and excess mileage is charged at $0.75 per mile. An early return or termination may carry a $750 fee plus unpaid amounts, excess mileage, damage, recovery, and collection costs.</p>
            <p>Any purchase option is “as is, where is,” subject to the agreement remaining in good standing and payment of the current payoff amount. No ownership transfers until all required amounts and transfer documents are completed.</p>
            <p>California law governs this agreement. Default may result in repossession and liability for unpaid amounts and reasonable collection costs. The member must report address or phone changes within 10 days and report mileage monthly.</p>
          </section>

          <div className="flex items-start gap-3 bg-rental-surface p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-rental-success" />
            <p className="text-sm">By accepting, <b>{valueOrAdmin(memberName)}</b> confirms the agreement is complete, has been read, and will be signed electronically with the name entered on the booking.</p>
          </div>
          <Button type="button" className="w-full rounded-none bg-rental-primary text-rental-primary-foreground hover:bg-rental-primary/90" onClick={() => { onAccept(); onOpenChange(false); }}>
            Agree, Sign &amp; Submit Agreement
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RentalMemberAgreement;