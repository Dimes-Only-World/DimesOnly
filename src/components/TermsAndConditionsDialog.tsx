import React, { useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import MembershipAgreementBody from "@/components/MembershipAgreementBody";
import { Tables } from "@/types";

type UserData = Tables<"users">;

interface Props {
  userData: UserData;
}

const EFFECTIVE_DATE = "March 9, 2025";

const SECTIONS: { heading: string; lines: string[] }[] = [
  {
    heading: "1. Who these terms apply to",
    lines: [
      "These Terms and Conditions govern your use of Dimes Only World, operated by Housing Angels, LLC, an Arizona limited liability company doing business as Dimes Only World (the “Company”).",
      "You must be at least 18 years of age (or the age of majority in your jurisdiction, if higher) to use the platform, and all information you give us must be true and complete.",
      "By creating an account, signing up, or continuing to use the site, you accept these terms.",
    ],
  },
  {
    heading: "2. Memberships and positions",
    lines: [
      "Newly registered members start as Silver Members. Silver is the base membership.",
      "Silver Plus, Diamond Plus, and Elite Plus are limited positions. They are not automatic: each must be separately elected, paid (unless expressly gifted in writing), accepted by the Company, and available at the time of upgrade.",
      "The initial class is capped at 300 Silver Plus, 300 Diamond Plus, and 100 Elite Plus positions. When a stage is sold out, the price for the next stage applies.",
      "Early access, complimentary membership, or promotional grants do not guarantee an upgrade, profit sharing, or any particular income.",
    ],
  },
  {
    heading: "3. Payments, prices, and refunds",
    lines: [
      "All prices are in U.S. dollars and are charged through PayPal or the payment method shown at checkout.",
      "Promo codes cannot be combined and may be withdrawn at any time.",
      "We may correct pricing or availability errors and cancel affected orders with a full refund.",
      "Clothing: unworn items with tags attached can be returned within 14 days of delivery. Limited drops, socks, durags, and final-sale items cannot be returned.",
      "Nothing on this platform is a promise of a specific dollar amount in any period.",
    ],
  },
  {
    heading: "4. Referral earnings and payouts",
    lines: [
      "Referral earnings, override earnings, and vehicle sale commissions are calculated by the Company from the referral chain recorded on your account. Amounts shown to you are calculated on our servers, not entered by you.",
      "A payout request requires a minimum available balance and only one open request can be pending at a time.",
      "Payouts are sent by PayPal, bank transfer (ACH), Venmo, or Cash App, using the details saved on your payout request.",
      "The Company may hold or correct a payout while identity, payment, or account information is verified.",
    ],
  },
  {
    heading: "5. Events and tickets",
    lines: [
      "Event access is a privilege, subject to capacity, venue rules, and ticket terms. Capacity is tracked per category shown on the event.",
      "Early-bird and member discounts are limited in quantity and end when the allotment is sold or the deadline passes.",
      "Events listed with dates to be announced are published without a confirmed date until the Company posts one.",
      "Ticket terms and cancellation rules for a specific event are shown at checkout and in your confirmation.",
    ],
  },
  {
    heading: "6. Car rentals, hosting, and vehicle purchases",
    lines: [
      "Rentals must be picked up within 28 days of the booking date. Monthly rentals run a maximum of 28 days.",
      "Long-term rentals require a minimum of 6 months. Rent-to-own terms run 48 months.",
      "Extension fees, late fees, and any deposit applied toward them are calculated by the platform from your booking; the amounts shown in your browser are not final until confirmed.",
      "Hosts: the $250 deposit per vehicle is forfeited if the listing is cancelled less than 30 days before pickup.",
      "Vehicle purchase applications are reviewed by the Company, and commissions on completed sales are paid from the recorded referral chain.",
    ],
  },
  {
    heading: "7. FlameFlix",
    lines: [
      "FlameFlix is a subscription service. Your subscription starts when you watch your first movie or series.",
      "Annual plans renew at the then-current annual rate. You can manage or change your plan from your FlameFlix account page.",
      "Content availability can change; titles may be added or removed without notice.",
    ],
  },
  {
    heading: "8. Conduct and content",
    lines: [
      "You may not copy, scrape, redistribute, or sell member photos, videos, or messages, or use another member's media without their permission.",
      "You may not impersonate another member, submit false identity information, or use the platform for unlawful activity.",
      "The Company may remove content, restrict features, or suspend or deactivate an account that violates these terms or brand standards.",
      "Marketing use of your media: once you join the network, all photos and videos you upload may be used at the Company's discretion for marketing and promotion purposes, without further consent from you.",
    ],
  },
  {
    heading: "9. Privacy",
    lines: [
      "Our Privacy Policy is available from the footer of every page. We collect only what we need to run your account and process payments, and we do not sell your personal information.",
      "Sensitive documents, such as age-verification selfies and vehicle purchase applications, are stored privately and shared only through secure, time-limited links.",
    ],
  },
  {
    heading: "10. Fans and Dimes",
    lines: [
      "To open a fan account you must be at least 18, legally allowed to view adult content where you live, and give a valid email, username, and password. We may ask for more information or decline any application.",
      "Some content on Dimes Only is adult material. By entering, you agree to see it and you are responsible for where and how you view it.",
      "Tips, ratings, paid media, and messages are agreements between the fan and the Dime. The Company runs the platform and may moderate content, but is not a party to those agreements.",
      "When a fan's payment is confirmed, the Dime must deliver what was offered.",
      "Fans agree to pay the price shown plus any applicable sales tax. Payments are processed in US dollars by our approved payment providers (PayPal and Cash App). Your bank may add its own fees.",
      "Memberships and subscriptions renew automatically at the current price until you cancel before the next billing date, your payment is declined, or you close your account. Price increases are shown before you are charged.",
      "Do not make unjustified refund or chargeback requests on tips or purchases. Bad-faith refunds or chargebacks may lead to account suspension or closure.",
      "Fans receive a personal, non-transferable right to view purchased content on Dimes Only only. Downloading, screen-recording, sharing, or reselling it is not allowed.",
      "You are responsible for keeping your login secure. We are not responsible for losses from a lost, shared, or compromised account.",
      "Dimes confirm they own or have permission for everything they upload, and that every person shown is 18 or older and has given written consent.",
      "We may suspend or close an account, pause payments, or refund purchases while we review suspected fraud, unlawful activity, or breaches of these terms. We will notify you and give the reason.",
    ],
  },

  {
    heading: "11. Referral program",
    lines: [
      "Referral earnings are paid only on real purchases by people who join with your link, at the rates shown on your Earnings page. You never pay to join the referral program.",
      "Earnings are not guaranteed. Do not promise anyone income for signing up others. Self-referrals, fake accounts, and spam are not allowed and may lead to withheld earnings or account closure.",
      "Suspended, terminated, or deleted accounts are not eligible for referral payments.",
    ],
  },
  {
    heading: "12. Complaints",
    lines: [
      "To report content, a member, or a problem with our service, email Talent@DimesOnly.World with your username, a description, and any links. We aim to review complaints within 7 business days.",
      "Content reported as illegal or non-consensual is removed while we investigate.",
    ],
  },
  {
    heading: "13. Appeals",
    lines: [
      "If we remove your content or restrict, suspend, or close your account, you may appeal within 30 days by emailing Talent@DimesOnly.World with your username and why you believe the decision was wrong.",
      "A different team member reviews each appeal, and we notify you of the outcome.",
    ],
  },
  {
    heading: "14. Law enforcement and safety",
    lines: [
      "We do not allow content involving minors, non-consent, trafficking, or other illegal activity. We report it to the proper authorities.",
      "We respond to valid legal requests from law enforcement and may keep account records as the law requires.",
    ],
  },
  {
    heading: "15. Disputes",
    lines: [
      "If you have a dispute with us, contact us first so we can try to resolve it. If we can't, both sides agree to try mediation before any legal claim.",
      "These terms are governed by the laws of the State of California.",
    ],
  },
  {
    heading: "16. Changes and contact",
    lines: [
      "We may update these terms. The effective date at the top of this page shows when they were last changed.",
      "Address: 12100 Wilshire Blvd #800, Los Angeles, CA 90025.",
      "Phone: 707.640.1661. Email: Talent@DimesOnly.World.",
    ],
  },
];


const TermsAndConditionsDialog: React.FC<Props> = ({ userData }) => {
  const [open, setOpen] = useState(false);
  const [showFullAgreement, setShowFullAgreement] = useState(false);

  const tier = userData.diamond_plus_active
    ? "diamond_plus"
    : userData.silver_plus_active
    ? "silver_plus"
    : userData.user_type === "business_owner"
    ? "elite_plus"
    : null;

  const close = () => {
    setOpen(false);
    setShowFullAgreement(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setShowFullAgreement(false);
      }}
    >
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="flex items-center gap-2 min-h-12 touch-manipulation"
        >
          <FileText className="w-4 h-4" />
          Terms &amp; Conditions
        </Button>
      </DialogTrigger>
      <DialogContent className="terms-dialog max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-foreground">Terms &amp; Conditions</DialogTitle>
          <DialogDescription>
            Effective Date: {EFFECTIVE_DATE} — Housing Angels, LLC (Dimes Only World)
          </DialogDescription>
        </DialogHeader>

        {showFullAgreement && tier ? (
          <div className="space-y-3">
            <MembershipAgreementBody tier={tier} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowFullAgreement(false)}
              className="min-h-12 touch-manipulation"
            >
              Back to summary
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-[60vh] w-full rounded-md border p-4">
            <div className="space-y-5">
              {SECTIONS.map((section) => (
                <section key={section.heading}>
                  <h4 className="font-semibold text-foreground pt-1">{section.heading}</h4>
                  <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">
                    {section.lines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </ScrollArea>
        )}

        {!showFullAgreement && tier && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => setShowFullAgreement(true)}
              className="min-h-12 touch-manipulation"
            >
              View my full membership agreement
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={close}
              className="min-h-12 touch-manipulation"
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TermsAndConditionsDialog;
