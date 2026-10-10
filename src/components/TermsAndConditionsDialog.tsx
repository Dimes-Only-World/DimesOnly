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

type UserData = Tables<"users">;

interface Props {
  userData: UserData;
}

const EFFECTIVE_DATE = TERMS_EFFECTIVE_DATE;
const SECTIONS = TERMS_SECTIONS;

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
