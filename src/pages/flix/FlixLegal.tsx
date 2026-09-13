import React from "react";
import { useParams } from "react-router-dom";
import FlixNav from "@/components/flix/FlixNav";
import FlixFooter from "@/components/flix/FlixFooter";
import { FLIX_TERMS_BODY } from "@/data/flixTerms";
import "@/components/flix/flix.css";

const CONTENT: Record<string, { title: string; body: string[] }> = {
  terms: {
    title: "Terms of Service",
    body: FLIX_TERMS_BODY,
  },
  privacy: {
    title: "Privacy Policy",
    body: [
      "Dimes Only World · Housing Angels, LLC platform",
      "Last updated: September 13, 2026",
      "This is the Privacy Policy of FlameFlix, Inc. (hereafter referred to as “FlameFlix,” “us,” or “we”). This Privacy Policy describes how your personal information is collected, used, and shared when you use our streaming service through our website https://dimesonly.world or any of our branded apps (together, the “Service”).",
      "FlameFlix, Inc. respects your privacy. We collect only the information needed to run your account: your Dimes Only identity, watch progress, and subscription status.",
      "Watch history and progress are stored to power Continue Watching and recommendations. We do not sell your personal data.",
      "Referral attribution data is used solely to calculate and pay Dimes Only earnings.",
      "By using the Service, you agree to the collection, use and disclosure of your information as described in this Privacy Policy. We may modify this Privacy Policy from time to time. Your continued use of the Service constitutes your agreement to any updated Privacy Policy on a prospective basis.",
      "PERSONAL INFORMATION WE COLLECT",
      "Account Registration Information",
      "In order to sign up for a free trial or make a purchase, you must create an account. We collect your Dimes Only identity (including email address and password, and optionally a username and avatar for comments or forums), subscription status, and related account credentials.",
      "Payment Information",
      "You must also provide valid payment card information if you wish to sign up for a free trial, subscription, or make any other purchase. Except for the name associated with your card and information about the transaction (e.g., time of transaction, amount), payment card information is collected directly by a third-party payment vendor and is not received or stored by us.",
      "Watch Progress and Viewing Activity",
      "Watch history and progress are stored to power Continue Watching and recommendations. This may include titles viewed, playback position, and related viewing metadata associated with your Dimes Only identity.",
      "Information Collected Automatically",
      "Each time you visit the Service, we automatically collect certain limited information about your device and your interaction with the Service as needed to run the Service. This may include your IP address, general location information, browser type, Internet service provider (ISP), referring/exit pages, operating system, date/time stamps, and related metadata.",
      "Referral Attribution",
      "Referral attribution data is used solely to calculate and pay Dimes Only earnings. We do not use referral data for sale, resale, or unrelated marketing.",
      "Comments",
      "We may offer the ability to provide comments or to post messages in a forum. Any posts you make will be publicly available.",
      "Other Information",
      "You may also choose to provide other information about yourself in connection with surveys, contests, special offers, customer support inquiries, and other communications with us.",
      "HOW WE USE YOUR INFORMATION",
      "We may use the information collected about you to:",
      "• Fulfill your orders and deliver content to you;",
      "• Maintain your Dimes Only identity, subscription status, and watch progress;",
      "• Power Continue Watching and recommendations;",
      "• Calculate and pay Dimes Only referral earnings;",
      "• Send you marketing communications (depending on your preferences);",
      "• Provide customer support to you;",
      "• Analyze how the Service is being used for troubleshooting and improvements;",
      "• Communicate with you;",
      "• Collect debts, prevent fraud, and protect the integrity of the Service;",
      "• Enforce our legal rights.",
      "We do not sell your personal data.",
      "DISCLOSURES TO THIRD PARTIES",
      "Authorized Service Providers",
      "We share your information with authorized service providers involved in operating the Service. Authorized service providers include payment providers, email service providers, hosting and streaming infrastructure providers, and analytics companies acting on our behalf. These providers are permitted to use your information only to perform services for us.",
      "Legal Situations",
      "We may disclose your information when we have a good faith belief that compliance is required by a search warrant, subpoena, court order, or similar request from a law enforcement or other government agency.",
      "To the Public",
      "We may publicly disclose aggregated user statistics and other information, which is not considered personal information. If you comment on a video or participate in a forum, your comment will be shared publicly.",
      "TARGETED ADVERTISING",
      "We may use your personal information to provide you with targeted advertisements or marketing communications we believe may be of interest to you. We do not sell your personal data for advertising.",
      "You can limit the use of your information for purposes of targeted advertising using a number of methods:",
      "• Via the Digital Advertising Alliance’s tool available at optout.aboutads.info, which lets you opt out of interest-based ads on websites.",
      "• Via the AppChoices mobile app, available at https://www.youradchoices.com/appchoices, which lets you opt out of interest-based ads in mobile apps.",
      "• Using platform-specific opt-out features: Google: https://adssettings.google.com/",
      "• Facebook: https://www.facebook.com/about/ads",
      "• By configuring your browser settings and/or mobile settings to restrict third-party cookies and/or the use of the advertising ID associated with your mobile device for interest-based advertising purposes.",
      "The options described above must be set on each of your devices in order to apply. Not all companies that serve interest-based ads participate in the ad industry opt-out programs described above, so even after opting out, you may still receive some cookies and interest-based ads from other companies.",
      "EMAILS",
      "Transaction Emails",
      "When you first create an account, we may send you a welcome email that provides information about your subscription and your account. If you make a purchase, we may send you an email confirming your purchase. We may also send you other emails concerning your account status and renewals. You may not opt out of transactional emails.",
      "Marketing Emails",
      "Depending on your preferences, we may send you emails letting you know about new programs or features, or promotions. You may opt out of these emails at any time in your account settings.",
      "YOUR PRIVACY RIGHTS",
      "You may change your account information or close your account at any time by logging into your account and adjusting your account settings. If you close your account or request that we delete your account, you may lose access to content you have purchased. When you close your account, we may preserve your account information to (i) let you know about new offers and content; (ii) restore your account, if you ever wish to re-subscribe; and (iii) where we believe in good faith that preservation is necessary to enforce our rights.",
      "To request access or deletion of your personal information, contact support@dimesonly.world. Contact support@dimesonly.world with any privacy questions or deletion requests.",
      "California Users",
      "Users from California have the right to: request information about the categories and sources of personal information collected about you, and the associated purposes for collection and third-party disclosures; request a copy of your personal information; request deletion of your personal information; and opt out of the sale of your personal information. FlameFlix does not sell personal information.",
      "To exercise your right to access or delete your personal information, submit your request to support@dimesonly.world. Note that to process your request, we must be able to verify your identity as the owner of the account you are inquiring about. We may not be able to fulfill your request until we can do so. Although you do not need to have an account to submit a request, we may not be able to locate certain information to process your request if you don’t have one.",
      "Nevada Users",
      "Nevada residents have the right to opt out of the sale of certain “covered information” collected by operators of websites or online services. We currently do not sell covered information, as “sale” is defined by such law, and we don’t have plans to sell this information.",
      "CHILDREN’S PRIVACY",
      "The Service is not intended for individuals under the age of 16. If you are a parent or legal guardian who has discovered that your child has provided personal information through the Service without your consent, please contact us at support@dimesonly.world so that we can remove any unauthorized information.",
      "CHANGES",
      "We may update this privacy policy from time to time in order to reflect, for example, changes to our practices or for other operational, legal or regulatory reasons. Your continued use of the Service constitutes your agreement to any updated Privacy Policy on a prospective basis.",
      "CONTACT US",
      "FlameFlix, Inc.",
      "Email: support@dimesonly.world",
      "Website: https://dimesonly.world",
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
          {page.body.map((p, i) => {
            const isMarkedSection = p.startsWith("## ");
            const isMarkedSubheading = p.startsWith("### ");
            const displayText = p.replace(/^#{2,3} /, "");
            const isSection = isMarkedSection || (p === p.toUpperCase() && /[A-Z]/.test(p));
            const isSubheading = [
              "Account Registration Information",
              "Payment Information",
              "Watch Progress and Viewing Activity",
              "Information Collected Automatically",
              "Referral Attribution",
              "Comments",
              "Other Information",
              "Authorized Service Providers",
              "Legal Situations",
              "To the Public",
              "Transaction Emails",
              "Marketing Emails",
              "California Users",
              "Nevada Users",
            ].includes(p) || isMarkedSubheading;

            if (isSection) {
              return <h2 key={i} className="pt-6 text-2xl font-black text-[#F5F5F5]">{displayText}</h2>;
            }
            if (isSubheading) {
              return <h3 key={i} className="pt-3 text-lg font-bold text-[#F5F5F5]">{displayText}</h3>;
            }
            return (
              <p key={i} className={`leading-relaxed ${p.startsWith("• ") ? "pl-5 text-[#C7C7C7]" : "text-[#A1A1A1]"}`}>
                {displayText}
              </p>
            );
          })}
        </div>
      </div>
      <FlixFooter />
    </div>
  );
};

export default FlixLegal;
