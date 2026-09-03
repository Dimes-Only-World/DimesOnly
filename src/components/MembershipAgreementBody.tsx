import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SILVER_PLUS_AGREEMENT,
  ELITE_PLUS_AGREEMENT,
} from "@/lib/membershipAgreementText";

type AgreementTier = "diamond_plus" | "silver_plus" | "elite_plus";

interface Props {
  title?: string;
  tier?: AgreementTier;
}

const isHeading = (line: string) => /^\d{1,2}\.\s+[A-Z]/.test(line);

const TextAgreement: React.FC<{ lines: string[] }> = ({ lines }) => (
  <ScrollArea className="h-[28rem] w-full rounded-md border p-4">
    <div className="space-y-3 text-sm leading-relaxed">
      {lines.map((line, i) =>
        isHeading(line) ? (
          <h4 key={i} className="font-semibold pt-2">
            {line}
          </h4>
        ) : (
          <p key={i}>{line}</p>
        )
      )}
    </div>
  </ScrollArea>
);

/**
 * Full membership agreement body.
 * Diamond Plus uses the in-file text; Silver Plus and Elite Plus use their
 * own source documents.
 */
const MembershipAgreementBody: React.FC<Props> = ({
  title = "STRIPPER & EXOTIC FEMALE MEMBERSHIP AGREEMENT",
  tier = "diamond_plus",
}) => {
  if (tier === "silver_plus") return <TextAgreement lines={SILVER_PLUS_AGREEMENT} />;
  if (tier === "elite_plus") return <TextAgreement lines={ELITE_PLUS_AGREEMENT} />;

  return (
    <ScrollArea className="h-[28rem] w-full rounded-md border p-4">
      <div className="space-y-5 text-sm leading-relaxed">
        <div className="text-center">
          <h2 className="text-lg font-bold">HOUSING ANGELS, LLC</h2>
          <h3 className="text-md font-semibold">{title}</h3>
        </div>


        <p>
          This Membership Agreement (the “Agreement”) is entered into as of the date of the last
          signature below (the “Effective Date”), by and between Housing Angels, LLC, an Arizona
          limited liability company doing business as Dimes Only World (the “Company”), and the
          individual identified in the uploaded identification below (the “Member”), effective as of
          the date the agree button is triggered by the Member below.
        </p>
        <p>
          The Company operates a premium membership, lifestyle, and earning platform known as Dimes
          Only World, designed for exotic dancers, strippers, members, and club owners. The Member
          has already obtained a 3 year Diamond Membership and, if elected and accepted, a Diamond
          Plus upgrade, and to participate in the Company’s referral, content, event, and (if
          applicable) profit-sharing programs, subject to the terms of this Agreement.
        </p>
        <p>
          NOW, THEREFORE, in consideration of the mutual promises herein, the Parties agree as
          follows:
        </p>

        <section>
          <h4 className="font-semibold">1. NATURE OF THE RELATIONSHIP</h4>
          <p>
            1.1 This Agreement creates a membership relationship, not an employment, partnership,
            joint-venture, or agency relationship. The Member is an independent participant on the
            platform. Nothing in this Agreement makes the Member an employee or owner of the
            Company.
          </p>
          <p>
            1.2 Diamond Membership is a lifetime platform membership for approved exotic dancers /
            strippers / exotic females, subject to continued good standing, compliance with this
            Agreement, and the Company’s eligibility, age-verification, and approval rules.
          </p>
          <p>
            1.3 Diamond is the base performer membership. Diamond Plus is a limited, upgraded
            profit-sharer position. Diamond Plus is not automatic. It must be separately elected,
            paid (unless expressly gifted in writing), approved, and available at the time of
            upgrade.
          </p>
          <p>
            1.4 Early access, complimentary Diamond Membership, or promotional grants do not
            guarantee Diamond Plus, profit sharing, or any particular income.
          </p>
        </section>

        <section>
          <h4 className="font-semibold">2. ELIGIBILITY, IDENTITY, AND APPROVAL</h4>
          <p>
            2.1 The Member represents that they are at least eighteen (18) years of age (or the age
            of majority in their jurisdiction, if higher), that all registration information is true
            and complete, and that they have the legal right to appear on and participate in an
            adult-oriented platform.
          </p>
          <p>
            2.2 The Company may require government identification and identity verification before
            issuing a Diamond Card, activating payouts, or approving a public profile. The Member
            agrees to keep all profile and payout information accurate.
          </p>
          <p>
            2.3 Performer profiles may display a status of Pending Approval, Approved, or Approval
            Denied. Public earning features, featured placement, and certain performer tools may
            remain inactive until the Company approves the Member’s profile.
          </p>
          <p>
            2.4 The Company may deny, suspend, or revoke approval at any time for false information,
            policy violations, legal risk, or conduct inconsistent with brand standards.
          </p>
        </section>

        <section>
          <h4 className="font-semibold">3. DIAMOND MEMBERSHIP BENEFITS</h4>
          <p>Subject to good standing and platform rules, a Diamond Member receives:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>
              Lifetime Diamond Membership access to the Dimes Only World platform (subject to
              Section 10)
            </li>
            <li>
              Access to clubs, mansion parties, concerts, yacht parties, comedy shows, and other
              member events as available and subject to capacity, venue rules, and invitation or
              ticket terms
            </li>
            <li>Exclusive Diamond-level content</li>
            <li>Priority support relative to non-Diamond members</li>
            <li>Member-only events and Money Circle tools as the Company makes them available</li>
            <li>
              The right to build a referral / Money Circle network and earn commissions under
              Section 5
            </li>
            <li>
              A public performer profile after approval, including banner/video and status display
            </li>
            <li>
              Access to platform earning features (tips, contests, interactions) according to
              then-current rules
            </li>
          </ul>
          <p className="mt-2">
            Event access, venue entry, and third-party experiences are privileges, not guaranteed
            property rights. Availability, guest limits, dress codes, and local law control.
          </p>
        </section>

        <section>
          <h4 className="font-semibold">4. DIAMOND PLUS (PROFIT-SHARER UPGRADE)</h4>
          <p>
            4.1 If the Member upgrades to Diamond Plus while positions remain open, and the Company
            accepts the upgrade, the Member becomes a limited profit-sharer in the performer group.
          </p>
          <p>
            4.2 The Company has designated the first three hundred (300) strippers and/or exotic
            females who upgrade to Diamond Plus as the initial performer profit-share class. Those
            accepted positions are intended to receive up to $125,000 per year maximum, paid
            quarterly at up to $31,250 maximum, from the Company’s profit-share pool, if and when
            profit sharing is activated under this Section.
          </p>
          <p>
            4.3 Profit sharing is designed to begin when all of the following have occurred: (a) 300
            strippers/exotic females have upgraded to Diamond Plus; (b) 300 males and/or regular
            females have upgraded to Silver Plus; and (c) 100 business owners have upgraded to Elite
            Plus (700 Plus positions in the initial class). After those 700 upgrades, Tier 1 profit
            sharing is intended to begin.
          </p>
          <p>
            4.4 When the Company later reaches a separately announced revenue threshold, Tier 2 is
            intended to activate for the profit-share class, with a stated target of at least
            $2,500,000 per year from the minimum revenue that triggers Tier 2. If Company revenue
            later falls below that threshold, Tier 1 is intended to reactivate.
          </p>
          <p>
            4.5 Profit-share amounts are maximums, not guaranteed salaries. Actual distributions
            depend on Company profits, the size of the pool, the number of active Plus members in
            good standing, and the Company’s written distribution rules at the time of payout.
            Nothing in this Agreement is a promise of a specific dollar amount in any quarter.
          </p>
          <p>
            4.6 Profit-share distributions, if any, are paid quarterly and only while the Member
            remains an active Diamond Plus member in good standing. They are in addition to referral
            commissions, tips, overrides, and other platform earnings.
          </p>
          <p>
            4.7 Diamond Plus positions are strictly limited. Once filled, they are gone. The Member
            must upgrade before the app launch or before the designated positions are filled,
            whichever occurs first, unless the Company later opens additional classes in writing.
          </p>
          <p>
            4.8 Profit sharing is a contractual membership benefit. It is not stock, equity, a
            security offering, or a right to manage the Company. The Member has no voting rights and
            no claim to Company assets beyond distributions the Company actually declares under this
            Agreement.
          </p>
        </section>

        <section>
          <h4 className="font-semibold">5. REFERRALS, OVERRIDES, AND MONEY CIRCLE</h4>
          <p>
            5.1 The Member may refer other persons to the platform. Subject to the then-current
            referral rules and good standing:
          </p>
          <ul className="list-disc list-inside ml-4">
            <li>20% commission / override on qualifying activity of persons the Member directly refers</li>
            <li>10% commission / override on qualifying second-level referrals</li>
          </ul>
          <p className="mt-2">
            5.2 Overrides from females in the Member’s network are included in override
            calculations. Referral fees may increase after the full app is released, as the Company
            announces in writing.
          </p>
          <p>
            5.3 Certain performer-referral payouts may require the referring member to hold an
            upgraded Plus membership. The dashboard will display applicable earning rules after
            registration.
          </p>
          <p>
            5.4 Commissions are calculated only on qualifying, collected revenue and may be adjusted
            for refunds, chargebacks, failed payments, fraud, or policy violations. Installment
            payments generate corresponding installment commissions when actually received.
          </p>
          <p>
            5.5 The Money Circle is the Member’s visible network. Activity inside the circle may
            generate residual commissions when the people in that circle generate qualifying
            revenue.
          </p>
        </section>

        <section>
          <h4 className="font-semibold">6. FEES AND COMPLIMENTARY MEMBERSHIPS</h4>
          <p>
            6.1 Base Diamond Membership may be granted as a promotional or early-access membership
            (including a free or term-limited Silver/Diamond grant) as the Company specifies at
            signup. Any upgrade fee for Diamond Plus is a one-time fee unless the Company states
            otherwise in writing.
          </p>
          <p>
            6.2 Complimentary or early Diamond Membership does not include Diamond Plus profit
            sharing unless the Member separately upgrades and is accepted into an open Plus class.
          </p>
          <p>
            6.3 Fees are generally non-refundable except where required by law or where the Company
            has published a specific refund window in writing for a particular product. Platform use
            after purchase constitutes acceptance of the applicable fee terms.
          </p>
        </section>

        <section>
          <h4 className="font-semibold">7. CONTENT, LIKENESS, AND INTELLECTUAL PROPERTY</h4>
          <p>
            7.1 The Member retains ownership of original photos, videos, and content they upload
            (“Member Content”), subject to the license in this Section.
          </p>
          <p>
            7.2 The Member grants the Company a worldwide, royalty-free, sublicensable license to
            host, display, promote, clip, and distribute Member Content on the platform, in
            marketing, events, and related media, for so long as the Member’s account exists and for
            a reasonable period afterward as needed to wind down cached or archived materials.
          </p>
          <p>
            7.3 The Member represents that they own or control all rights in Member Content, that
            all persons depicted are consenting adults, and that the content does not violate law or
            third-party rights.
          </p>
          <p>
            7.4 The Company’s names, logos, software, layouts, and trademarks remain Company
            property. The Member receives a limited, revocable license to use them only as needed to
            participate on the platform.
          </p>
        </section>

        <section>
          <h4 className="font-semibold">8. CONDUCT AND BRAND STANDARDS</h4>
          <p>
            The Member agrees to maintain professional conduct consistent with the Dimes Only World
            brand; not to misrepresent earnings, membership status, or Company affiliation; not to
            harass, defraud, or exploit other members; and not to use the platform for any unlawful
            purpose. The Company may remove content, suspend features, or terminate membership for
            violations.
          </p>
        </section>

        <section>
          <h4 className="font-semibold">9. CONFIDENTIALITY</h4>
          <p>
            The Member shall not disclose non-public Company information, including member data,
            payout formulas not published to members, unreleased product plans, or internal
            communications. This duty survives termination for three (3) years, and longer for trade
            secrets.
          </p>
        </section>

        <section>
          <h4 className="font-semibold">10. TERM, SUSPENSION, AND TERMINATION</h4>
          <p>
            10.1 Diamond Membership is intended to continue for the Member’s lifetime while the
            Member remains in good standing and the platform remains in operation.
          </p>
          <p>
            10.2 The Company may suspend or terminate this Agreement for material breach, fraud,
            chargebacks, illegal activity, false identity, underage involvement, or conduct that
            materially harms the brand or other members. The Member may terminate by written notice
            and closing the account.
          </p>
          <p>
            10.3 Upon termination, platform access ends. Accrued, earned, and undisputed commissions
            on already-collected qualifying revenue will be paid according to the regular payout
            cycle, less offsets. Unvested or unearned profit-share expectations expire. Sections 7,
            8, 9, 11, 12, and 13 survive.
          </p>
        </section>

        <section>
          <h4 className="font-semibold">11. TAXES AND PAYOUTS</h4>
          <p>
            The Member is solely responsible for taxes on all amounts received. The Company may
            issue Form 1099-NEC or other required tax forms and may require a W-9 (or equivalent)
            before payout. The Member is an independent contractor with respect to commissions and
            profit-share distributions, not a Company employee.
          </p>
        </section>

        <section>
          <h4 className="font-semibold">12. DISCLAIMERS</h4>
          <p>
            THE PLATFORM, EVENTS, AND EARNING FEATURES ARE PROVIDED “AS IS.” THE COMPANY DOES NOT
            GUARANTEE ANY LEVEL OF INCOME, TIPS, REFERRALS, APP LAUNCH DATE, OR PROFIT-SHARE
            DISTRIBUTION. EXAMPLES USED IN MARKETING ARE ILLUSTRATIVE MAXIMUMS OR HYPOTHETICALS. THE
            MEMBER IS RESPONSIBLE FOR THEIR OWN RECRUITING, CONTENT, AND TAX COMPLIANCE. THE COMPANY
            IS NOT A BROKER-DEALER AND THIS AGREEMENT IS NOT AN OFFER OF SECURITIES.
          </p>
        </section>

        <section>
          <h4 className="font-semibold">13. LIMITATION OF LIABILITY AND INDEMNITY</h4>
          <p>
            To the maximum extent permitted by law, the Company’s total liability under this
            Agreement shall not exceed the membership or upgrade fees the Member actually paid to
            the Company in the twelve (12) months before the claim (or $500 if no fees were paid).
            The Company is not liable for indirect, incidental, or consequential damages. The Member
            shall indemnify the Company against claims arising from Member Content, the Member’s
            conduct, misrepresentations, or tax obligations.
          </p>
        </section>

        <section>
          <h4 className="font-semibold">14. GOVERNING LAW</h4>
          <p>
            This Agreement is governed by the laws of the State of Arizona, without regard to
            conflict-of-law rules. The Parties shall first attempt good-faith negotiation for
            fifteen (15) days. Thereafter, exclusive venue lies in the state or federal courts in
            Arizona.
          </p>
        </section>

        <section>
          <h4 className="font-semibold">15. GENERAL TERMS</h4>
          <p>
            This Agreement is the entire understanding regarding Diamond Membership and supersedes
            prior discussions on that subject. It may be amended only in a writing signed by the
            Company, or by an updated online terms set that the Member accepts by continued use
            after notice. If a provision is unenforceable, the remainder stays in force. The Member
            may not assign this Agreement without Company consent. Electronic signatures and
            counterparts are valid.
          </p>
          <p>
            IN WITNESS WHEREOF, the Parties have executed this Membership Agreement as of the
            Effective Date.
          </p>
          <p className="font-semibold">{"\n"}</p>
        </section>
      </div>
    </ScrollArea>
  );
};

export default MembershipAgreementBody;
