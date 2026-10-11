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
import { TERMS_EFFECTIVE_DATE, TERMS_SECTIONS } from "@/lib/termsContent";
import { AUP_EFFECTIVE_DATE, AUP_SECTIONS } from "@/lib/acceptableUsePolicy";
import { FAN_DIME_EFFECTIVE_DATE, FAN_DIME_SECTIONS } from "@/lib/fanDimeAgreement";
import { P2B_EFFECTIVE_DATE, P2B_SECTIONS } from "@/lib/dimeBusinessTerms";

type UserData = Tables<"users">;
type Section = { heading: string; lines: string[] };

interface Props {
  userData: UserData;
}

// Numbered policy documents. Documents without sections yet show "Coming soon".
const POLICIES: { id: string; title: string; effective?: string; sections?: Section[] }[] = [
  { id: "terms", title: "Terms & Conditions", effective: TERMS_EFFECTIVE_DATE, sections: TERMS_SECTIONS },
  { id: "aup", title: "Acceptable Use Policy", effective: AUP_EFFECTIVE_DATE, sections: AUP_SECTIONS },
  { id: "terms-of-use", title: "Terms of Use" },
  { id: "fan-dime", title: "Contract between Fan and Dimes", effective: FAN_DIME_EFFECTIVE_DATE, sections: FAN_DIME_SECTIONS },
  { id: "p2b", title: "Platform to Business Regulation Terms", effective: P2B_EFFECTIVE_DATE, sections: P2B_SECTIONS },
  { id: "referral", title: "Referral Program Terms" },
  { id: "complaints", title: "Complaints Policy" },
  { id: "appeals", title: "Appeals Policy" },
  { id: "community", title: "Community Guidelines" },
];

const TermsAndConditionsDialog: React.FC<Props> = ({ userData }) => {
  const [open, setOpen] = useState(false);
  const [showFullAgreement, setShowFullAgreement] = useState(false);
  const [policyId, setPolicyId] = useState("terms");
  const policy = POLICIES.find((p) => p.id === policyId) || POLICIES[0];

  const tier = userData.diamond_plus_active
    ? "diamond_plus"
    : userData.silver_plus_active
    ? "silver_plus"
    : userData.user_type === "business_owner"
    ? "elite_plus"
    : null;

  const reset = () => {
    setShowFullAgreement(false);
    setPolicyId("terms");
  };
  const close = () => {
    setOpen(false);
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="flex items-center gap-2 min-h-12 touch-manipulation">
          <FileText className="w-4 h-4" />
          Terms &amp; Conditions
        </Button>
      </DialogTrigger>
      <DialogContent className="terms-dialog max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-foreground">{policy.title}</DialogTitle>
          <DialogDescription>
            {policy.effective ? `Effective Date: ${policy.effective} — ` : ""}Housing Angels, LLC (Dimes Only World)
          </DialogDescription>
        </DialogHeader>

        <nav aria-label="Policies" className="min-w-0">
          <ol className="grid grid-cols-1 gap-1 sm:grid-cols-2 text-sm">
            {POLICIES.map((p, i) => (
              <li key={p.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => { setPolicyId(p.id); setShowFullAgreement(false); }}
                  aria-current={p.id === policyId ? "page" : undefined}
                  className={`w-full min-h-10 touch-manipulation text-left underline-offset-4 hover:underline ${p.id === policyId ? "font-semibold text-primary underline" : "text-foreground"}`}
                >
                  {i + 1}. {p.title}
                  {!p.sections && <span className="ml-1 text-xs text-muted-foreground no-underline">(coming soon)</span>}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        {showFullAgreement && tier ? (
          <div className="space-y-3">
            <MembershipAgreementBody tier={tier} />
            <Button type="button" variant="outline" size="sm" onClick={() => setShowFullAgreement(false)} className="min-h-12 touch-manipulation">
              Back to summary
            </Button>
          </div>
        ) : (
          <ScrollArea key={policy.id} className="h-[50vh] w-full rounded-md border p-4">
            {policy.sections ? (
              <div className="space-y-5">
                {policy.sections.map((section) => (
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
            ) : (
              <p className="text-sm text-muted-foreground">This document will be added soon.</p>
            )}
          </ScrollArea>
        )}

        {!showFullAgreement && tier && policy.id === "terms" && (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" onClick={() => setShowFullAgreement(true)} className="min-h-12 touch-manipulation">
              View my full membership agreement
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={close} className="min-h-12 touch-manipulation">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TermsAndConditionsDialog;
