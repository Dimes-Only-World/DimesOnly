import React from "react";
import { useParams } from "react-router-dom";
import FlixNav from "@/components/flix/FlixNav";
import FlixFooter from "@/components/flix/FlixFooter";
import "@/components/flix/flix.css";

const CONTENT: Record<string, { title: string; body: string[] }> = {
  terms: {
    title: "Terms of Service",
    body: [
      "Welcome to FlameFlix, a streaming service operated by Flame Flix, LLC, a Dimes Only World company. By creating an account or streaming content, you agree to these terms.",
      "Subscriptions renew automatically at the end of each billing period. The annual promotional rate of $29.99 applies to your first year only; renewal occurs at the then-current annual rate (currently $59.99/year). You may cancel anytime before renewal.",
      "Content is for personal, non-commercial viewing only. You may not redistribute, record, or rebroadcast any FlameFlix content.",
      "FlameFlix is intended for audiences 18 and older. Some content is rated TV-MA and intended for mature audiences.",
    ],
  },
  privacy: {
    title: "Privacy Policy",
    body: [
      "Flame Flix, LLC respects your privacy. We collect only the information needed to run your account: your Dimes Only identity, watch progress, and subscription status.",
      "Watch history and progress are stored to power Continue Watching and recommendations. We do not sell your personal data.",
      "Referral attribution data is used solely to calculate and pay Dimes Only earnings.",
      "Contact support@dimesonly.world with any privacy questions or deletion requests.",
    ],
  },
  "acceptable-use": {
    title: "Acceptable Use",
    body: [
      "Do not share accounts outside your household, attempt to circumvent the paywall or guest preview limits, or scrape/republish FlameFlix content.",
      "Violations may result in account termination without refund.",
    ],
  },
};

const FlixLegal: React.FC = () => {
  const { doc } = useParams<{ doc: string }>();
  const page = CONTENT[doc || "terms"] || CONTENT.terms;
  return (
    <div className="min-h-screen bg-[#0B0B0D] text-white">
      <FlixNav />
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-black">{page.title}</h1>
        <div className="mt-8 space-y-5">
          {page.body.map((p, i) => (
            <p key={i} className="text-[#A1A1A1] leading-relaxed">{p}</p>
          ))}
        </div>
      </div>
      <FlixFooter />
    </div>
  );
};

export default FlixLegal;
