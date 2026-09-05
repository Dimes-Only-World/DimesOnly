import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Block: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-1">
    <h4 className="font-semibold text-foreground">{title}</h4>
    <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
  </div>
);

export const CancellationPolicyDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ open, onOpenChange }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Cancellation policy</DialogTitle>
        <DialogDescription>How cancellations and no-shows are handled.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <Block title="Free Cancellation Period">
          Guests can cancel for free up to 24 hours before the trip starts. For trips booked within
          24 hours of the start time, they can cancel within one hour without any fee.
        </Block>
        <Block title="Cancellation Fees">
          If cancellation occurs outside the free period, guests face fees based on trip length. For
          trips over 3 days, the fee is equivalent to one day's cost (Daily rent + Trip fee) + 1/2
          delivery if ordered; for shorter trips, it's half a day's cost + 1/2 delivery if ordered.
        </Block>
        <Block title="No-Show Fees">
          No-show fees are higher, charging guests the cost of 2 days for trips longer than 3 days
          and 100% of one day for shorter trips (Daily rent + Trip fee), plus half of any delivery
          fee.
        </Block>
      </div>
    </DialogContent>
  </Dialog>
);

export const PaymentDetailsDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ open, onOpenChange }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Payment details</DialogTitle>
        <DialogDescription>Trip cost breakdown</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Some trip costs are part of every trip, while others are added when you choose certain
          options. Each element is a separate charge. If you want to add, remove, or change
          something on the list, use the back arrow to exit the checkout screen and make updates to
          your selections.
        </p>
        <Block title="Trip price">
          This is a vehicle's listed rate multiplied by the trip duration. The Trip price you see
          shows the vehicle's daily rate for your chosen trip dates.
        </Block>
        <Block title="Protection">
          To ensure your peace of mind, our total price includes a protection plan with collision
          and third party liability coverage.
        </Block>
        <Block title="Trip fee">
          Trip fees go directly to Dimes Only and help us run the platform. The trip fee is
          calculated at checkout and varies on the vehicle's value.
        </Block>
        <Block title="Unlimited mileage">
          This is a vehicle's listed unlimited mileage rate multiplied by the trip length.
        </Block>
        <Block title="Extras">
          This is the cost for optional add-on items or conveniences. These include things like
          prepaid refueling or child seat.
        </Block>
        <Block title="Delivery fee">
          This is the amount a host charges to pick up and drop off a vehicle. One single fee covers
          delivery of the vehicle at the start and end of a trip.
        </Block>
      </div>
    </DialogContent>
  </Dialog>
);
