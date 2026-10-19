import React from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/lib/router-compat";
import BestLogoBanner from "@/components/rentals/BestLogoBanner";

export type LegalSection = { heading: string; lines: string[] };

const LegalPage: React.FC<{ title: string; subtitle?: string; sections: LegalSection[]; notice?: string }> = ({ title, subtitle, sections, notice }) => (
  <div className="rentals-showroom min-h-screen bg-rental-background text-rental-foreground">
    <BestLogoBanner />
    <main className="mx-auto max-w-3xl px-4 py-8 font-barlow sm:px-8">
      <h1 className="rentals-wordmark text-4xl sm:text-6xl">{title}</h1>
      {subtitle && <p className="mt-2 text-sm text-rental-muted">{subtitle}</p>}
      {notice && (
        <p className="mt-4 rounded-md border border-rental-warning bg-rental-surface p-3 text-sm font-semibold text-rental-warning">{notice}</p>
      )}
      <div className="mt-8 space-y-7 [overflow-wrap:anywhere]">
        {sections.map((s) => (
          <section key={s.heading} className="space-y-2">
            <h2 className="text-lg font-semibold uppercase tracking-wide text-rental-primary">{s.heading}</h2>
            {s.lines.map((line, i) => (
              <p key={i} className="text-sm leading-relaxed text-rental-muted">{line}</p>
            ))}
          </section>
        ))}
      </div>
      <div className="mt-12">
        <Link to="/rentals" className="inline-flex w-full items-center justify-center gap-2 bg-rental-primary px-6 py-4 font-semibold uppercase text-rental-primary-foreground hover:bg-rental-primary/90 sm:w-auto">
          <ArrowLeft className="h-5 w-5" /> Back to Rentals
        </Link>
      </div>
    </main>
  </div>
);

export default LegalPage;
