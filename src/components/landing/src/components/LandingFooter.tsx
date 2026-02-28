import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const navLinks = [
  { label: "Mens Clothing", href: "/clothes" },
  { label: "Buy a Car", href: "#" },
  { label: "Profit Sharing", href: "#" },
  { label: "Apply Online", href: "#" },
  { label: "Contact Us", href: "#" },
];

const LandingFooter = () => {
  const [showPrivacy, setShowPrivacy] = useState(false);

  return (
    <footer className="py-10 bg-background border-t border-border">
      <div className="container mx-auto px-4">
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-6">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-muted-foreground text-sm hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
          <button
            onClick={() => setShowPrivacy(true)}
            className="text-muted-foreground text-sm hover:text-foreground transition-colors"
          >
            Privacy Policy
          </button>
        </nav>
        <p className="text-center text-muted-foreground text-xs">
          © 2025 Dimes Only Network. All rights reserved.
        </p>
      </div>

      <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Privacy Policy</DialogTitle>
          </DialogHeader>
          <div className="text-muted-foreground text-sm leading-relaxed space-y-4">
            <p>
              Dimes Only Network is committed to protecting your privacy. This Privacy Policy
              explains how we collect, use, and safeguard your personal information when you use our platform.
            </p>
            <p>
              We collect information you provide directly to us, such as when you create an account,
              make a purchase, or contact us for support. This may include your name, email address,
              payment information, and profile details.
            </p>
            <p>
              We use this information to operate and improve our services, process transactions,
              communicate with you, and ensure the security of our platform.
            </p>
            <p>
              We do not sell your personal information to third parties. We may share information
              with service providers who assist us in operating our platform, subject to
              confidentiality agreements.
            </p>
            <p>
              For questions about this Privacy Policy, please contact us through the Contact Us page.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </footer>
  );
};

export default LandingFooter;
