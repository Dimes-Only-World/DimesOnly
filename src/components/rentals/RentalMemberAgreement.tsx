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
  const missingVehicleFields = fields.slice(1).filter(([, value]) => value === null || value === undefined || value === "").map(([label]) => label);
  const agreementIncomplete = missingVehicleFields.length > 0 || !memberName.trim() || !memberAddress?.trim() || !startDate || !endDate;

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
            {isRentToOwn && <p className="text-sm text-rental-muted"><b className="text-rental-foreground">48-month contract total:</b> {money(rentToOwnContractTotal(vehicle?.monthly_rate, vehicle?.down_payment))}, calculated as the down payment plus 48 months × the listed monthly rate, less $75.</p>}
          </section>

          <section className="space-y-5 border-y border-rental-line py-5 text-sm leading-relaxed text-rental-muted">
            <div><h3 className="mb-1 font-semibold text-rental-foreground">1. Payment and insurance</h3><p>The member will make every use payment when due and maintain insurance throughout the use term with at least $15,000/$30,000 bodily injury liability, $10,000 property damage liability, and collision and comprehensive coverage with deductibles no greater than $500. The owner must be named as an additional insured or interest and the mortgagor as loss payee. Written proof and notice of changes must be supplied when requested.</p></div>
            <div><h3 className="mb-1 font-semibold text-rental-foreground">2. Mileage and purchase option</h3><p>Unless waived in writing, mileage is limited to an average of 15,000 miles per year, with excess mileage charged at $0.75 per mile. A purchase option, when offered, is “as is, where is,” is available only while the agreement is in good standing, and requires payment of the current payoff plus completion of title, bill-of-sale, and odometer documents. No ownership transfers before completion.</p></div>
            <div><h3 className="mb-1 font-semibold text-rental-foreground">3. Fees, tickets, and maintenance</h3><p>The member is responsible for emissions testing, licensing, registration, transfer fees, taxes, parking tickets, and a $15 administrative charge for an unpaid ticket. The member must follow manufacturer maintenance recommendations, check fluids, keep receipts, permit reasonable inspections, and make no value-reducing alterations or equipment removals without written permission.</p></div>
            <div><h3 className="mb-1 font-semibold text-rental-foreground">4. Authorized use and condition</h3><p>The vehicle may not be used unlawfully, to transport persons for hire, by an unlicensed or uninsurable driver, outside the continental United States, or outside California for more than 15 days without prior consent. The member is responsible for drivers, operating expenses, loss, theft, confiscation, damage, and prompt notice of any such event.</p></div>
            <div><h3 className="mb-1 font-semibold text-rental-foreground">5. Return and early termination</h3><p>The vehicle must be returned in good running condition, with matching serviceable tires and no damage beyond normal wear. Early termination may carry a $750 fee, plus unpaid use payments, excess mileage, damage, recovery, collection, and other amounts due under this agreement.</p></div>
            <div><h3 className="mb-1 font-semibold text-rental-foreground">6. Security, indemnity, and default</h3><p>This agreement grants the owner a continuing security interest in the vehicle. The member must keep it free of liens and indemnify the owner and mortgagor against claims arising from possession, operation, or return. False application information, missed payments, loss of insurance, or breach is a default and may result in termination, lawful repossession, and liability for insurance, recovery, collection, court, and reasonable attorney costs.</p></div>
            <div><h3 className="mb-1 font-semibold text-rental-foreground">7. Addendum and notices</h3><p>Late payments may carry a 15% charge. The member must notify Best Rental Car Service of address or phone changes within 10 days, obtain written permission before moving the vehicle out of state, report mileage monthly, and repair damage exceeding $500 within 30 days. Removal or concealment of the vehicle without consent is prohibited. California law governs this agreement.</p></div>
            <div className="border-l-2 border-rental-primary pl-3"><h3 className="mb-1 font-semibold text-rental-foreground">Notice to permissive member</h3><p>Do not accept this agreement until you have read it and every required blank is complete. Default may permit repossession without advance notice and may create liability for unpaid indebtedness and reasonable attorney fees. By signing, you certify that you read, received, understood, and agree to all terms and conditions.</p></div>
          </section>

          <div className="flex items-start gap-3 bg-rental-surface p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-rental-success" />
            <p className="text-sm">By accepting, <b>{valueOrAdmin(memberName)}</b> confirms the agreement is complete, has been read, and will be signed electronically with the name entered on the booking.</p>
          </div>
          {agreementIncomplete && <p className="border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">This agreement cannot be accepted until the member information, dates, and these vehicle details are complete: {missingVehicleFields.join(", ") || "member name and address"}.</p>}
          <Button type="button" disabled={agreementIncomplete} className="w-full rounded-none bg-rental-primary text-rental-primary-foreground hover:bg-rental-primary/90" onClick={() => { onAccept(); onOpenChange(false); }}>
            Agree, Sign &amp; Submit Agreement
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RentalMemberAgreement;