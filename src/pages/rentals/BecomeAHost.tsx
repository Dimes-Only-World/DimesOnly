import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BadgeCheck,
  CarFront,
  ClipboardCheck,
  DollarSign,
  KeyRound,
  LifeBuoy,
  MapPin,
  Navigation,
  ShieldCheck,
  Smartphone,
  Star,
  TrendingUp,
  Trophy,
  UserCheck,
} from "lucide-react";
import RentalsFooter from "@/components/rentals/RentalsFooter";


const EARNINGS_PER_CAR = 485;

const HOST_STEPS = [
  {
    icon: BadgeCheck,
    title: "Apply and get approved",
    copy: "Submit a short application to tell us about your experience and where you want to operate. Once approved, we confirm your host location and onboarding details.",
  },
  {
    icon: KeyRound,
    title: "You run operations and get paid",
    copy: "You handle day-to-day operations: key handoffs, check-ins, basic inspections, and coordinating cleaning, maintenance, and repairs. For every completed trip, you earn a share of the rental revenue and receive payouts on a weekly basis.",
  },
];

const APPROVAL_TIMELINE = [
  {
    icon: MapPin,
    title: "Set Up Your Parking",
    copy: "Find a parking location and get it approved by Best, then secure and rent 5 spaces. Parking is arranged and paid for by you, so factor it into your startup costs. You'll also need room to expand to 10 spaces at the same site.",
  },
  {
    icon: CarFront,
    title: "Receive Your First Vehicles",
    copy: "As soon as your parking is approved, Best sends your first 5 vehicles — no waiting.",
  },
  {
    icon: DollarSign,
    title: "Start Earning",
    copy: "Bookings begin flowing within your first week of receiving your vehicles, and your first payout follows about a week after that.",
  },
  {
    icon: ClipboardCheck,
    title: "Complete 20 Trips and Unlock Owner Vehicles",
    copy: "Operate your fleet to complete your first 20 trips and establish your track record. Once you hit 20, you can start accepting vehicles from local owners into your fleet.",
  },
  {
    icon: TrendingUp,
    title: "Grow Your Fleet and Earnings",
    copy: "Scale up your fleet as your operation grows.",
  },
];

const HELP_POINTS = [
  {
    icon: Smartphone,
    title: "Easy to Use System",
    copy: "Run your fleet and bookings from a simple, mobile-friendly dashboard.",
  },
  {
    icon: CarFront,
    title: "Fleet Expansion",
    copy: "Best attracts car owners who want passive income and helps add their vehicles to your managed fleet.",
  },
  {
    icon: Navigation,
    title: "Demand Generation",
    copy: "Best drives guest demand, so you don't have to worry about marketing.",
  },
  {
    icon: LifeBuoy,
    title: "Safety & Support",
    copy: "Customer support, roadside assistance, and business guidance to keep your operation running smoothly.",
  },
];

const BUSINESS_CARDS = [
  {
    icon: Trophy,
    title: "Set Your Own Growth Pace",
    copy: "Build a flexible, scalable car-sharing business that fits your goals and lifestyle.",
  },
  {
    icon: Star,
    title: "Focus on Guest Experience",
    copy: "Give guests a five-star experience and increase your revenue through repeat bookings and positive reviews.",
  },
  {
    icon: Navigation,
    title: "Boost Bookings with Delivery",
    copy: "Offer delivery to guest locations to stand out from competitors and get your business off to a strong start.",
  },
];

const FAQ_ITEMS = [
  {
    q: "What are the host requirements?",
    a: "You must be at least 25, hold a valid driver's license, have active personal full-coverage car insurance, and be able to reliably handle basic day-to-day operations.",
  },
  {
    q: "Do I need to own cars to become a host?",
    a: "No. Best connects you with car owners who supply vehicles, and you manage those vehicles and trips.",
  },
  {
    q: "How soon can I start hosting?",
    a: "After we review your application and complete onboarding, you can start hosting as soon as vehicles and demand are available in your area.",
  },
  {
    q: "How much time does hosting take, and can I do it part-time?",
    a: "You can start part-time, with time needed depending on how many vehicles and trips you manage and covering tasks like cleaning, key handoffs, check-ins, and inspections.",
  },
  {
    q: "Can I list my own vehicles?",
    a: "Yes, you can list cars you personally own, as long as you have the title in hand and they meet Best's standards.",
  },
  {
    q: "How fast can I grow my fleet?",
    a: "Growth depends on demand, your performance, and owner vehicles placed with Best, and in some cases hosts can reach around 50 vehicles in about three months.",
  },
  {
    q: "When do I get paid?",
    a: "You earn a share from every completed trip and receive payouts weekly, which you can track in your Best dashboard.",
  },
  {
    q: "Who finds the guests - do I need to do my own marketing?",
    a: "Best brings guest demand through its platform and channels, so you focus on operations and guest experience.",
  },
];

const BecomeAHost: React.FC = () => {
  const [fleetSize, setFleetSize] = useState(5);
  const monthlyEarnings = fleetSize * EARNINGS_PER_CAR;

  return (
    <div className="rentals-showroom min-h-screen">
      <header className="flex items-center justify-between px-4 py-5 sm:px-8 lg:px-12">
        <Link to="/" className="rentals-wordmark text-2xl leading-none text-rental-foreground sm:text-3xl">
          DIMES ONLY
          <span className="block font-barlow text-[9px] font-semibold uppercase text-rental-muted sm:text-[10px]">World</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link
            to="/rentals"
            className="font-barlow text-xs font-semibold uppercase tracking-[0.18em] text-rental-muted transition-colors hover:text-rental-foreground sm:text-sm"
          >
            Book a car
          </Link>
          <div className="rentals-wordmark text-right text-2xl leading-[0.75] text-rental-foreground sm:text-3xl">
            BEST
            <span className="block text-rental-primary">RENTAL CARS</span>
          </div>
        </div>
      </header>

      {/* Hero + Host Calculator */}
      <section className="border-y border-rental-line bg-rental-surface">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-14 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:px-12 lg:py-20">
          <div className="flex flex-col justify-center">
            <p className="mb-3 flex items-center gap-2 font-barlow text-xs font-semibold uppercase text-rental-primary">
              <span className="h-px w-8 bg-rental-primary" /> Become a Host
            </p>
            <h1 className="rentals-wordmark text-5xl leading-[0.92] text-rental-foreground sm:text-6xl lg:text-7xl">
              START EARNING
              <span className="block text-rental-primary">WITHOUT BUYING</span>
              YOUR OWN CARS.
            </h1>
            <ul className="mt-6 space-y-2 font-barlow text-base text-rental-foreground/90 sm:text-lg">
              <li className="flex items-start gap-3">
                <UserCheck className="mt-1 h-4 w-4 shrink-0 text-rental-primary" />
                We provide the cars and bookings
              </li>
              <li className="flex items-start gap-3">
                <DollarSign className="mt-1 h-4 w-4 shrink-0 text-rental-primary" />
                You get paid every week
              </li>
              <li className="flex items-start gap-3">
                <BadgeCheck className="mt-1 h-4 w-4 shrink-0 text-rental-primary" />
                Start hosting in as little as 3 days
              </li>
            </ul>
            <p className="mt-6 max-w-lg font-barlow text-sm leading-relaxed text-rental-muted sm:text-base">
              You handle day-to-day operations and earn a share of trip revenue. Hosts can often manage
              around 25 cars without additional staff.
            </p>
            <div className="mt-8">
              <Button asChild size="lg" className="rounded-none bg-rental-primary font-barlow font-semibold uppercase tracking-wide text-rental-primary-foreground hover:bg-rental-primary/90">
                <Link to="/rentals/host/apply">
                  Become a Host <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="flex items-center">
            <div className="w-full rounded-none border border-rental-line bg-rental-elevated p-6 sm:p-8">
              <h2 className="font-barlow text-2xl font-bold text-rental-foreground">Host Calculator</h2>
              <p className="mt-1 font-barlow text-sm text-rental-muted">
                Estimate your monthly earnings as a Best host.
              </p>

              <div className="mt-8 flex items-center justify-between">
                <span className="flex items-center gap-2 font-barlow text-sm font-semibold uppercase tracking-wide text-rental-foreground">
                  <CarFront className="h-4 w-4 text-rental-primary" /> Fleet Size
                </span>
                <span className="font-barlow text-3xl font-bold text-rental-foreground">{fleetSize} cars</span>
              </div>
              <input
                type="range"
                min={5}
                max={50}
                step={5}
                value={fleetSize}
                onChange={(e) => setFleetSize(Number(e.target.value))}
                className="mt-4 w-full accent-[hsl(var(--rental-primary))]"
                aria-label="Fleet size"
              />
              <div className="mt-1 flex justify-between font-barlow text-xs text-rental-muted">
                <span>5 cars</span>
                <span>25 cars</span>
                <span>50 cars</span>
              </div>

              <div className="mt-8 flex items-center justify-between border-t border-rental-line pt-6">
                <span className="flex items-center gap-2 font-barlow text-sm font-semibold text-rental-foreground">
                  <TrendingUp className="h-4 w-4 text-rental-primary" /> Monthly Earnings*
                </span>
                <span className="font-barlow text-3xl font-bold text-rental-primary sm:text-4xl">
                  ${monthlyEarnings.toLocaleString("en-US")}
                </span>
              </div>
              <p className="mt-4 font-barlow text-xs leading-relaxed text-rental-muted">
                *Estimates only. Actual earnings depend on vehicle type, utilization, pricing, and market conditions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Onboarding banner */}
      <section className="px-4 py-10 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-3xl rounded-none border border-rental-line bg-rental-elevated px-6 py-5 text-center font-barlow">
          <p className="text-sm font-bold text-rental-foreground sm:text-base">Now onboarding hosts in the LA area.</p>
          <p className="mt-1 text-sm text-rental-muted">
            Outside Los Angeles? Apply now - we'll reach out as we grow.
          </p>
        </div>
      </section>

      {/* How hosting works */}
      <section className="border-t border-rental-line bg-rental-surface">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-8 lg:px-12">
          <h2 className="rentals-wordmark text-4xl text-rental-foreground sm:text-5xl">
            HOW <span className="text-rental-primary">HOSTING</span> WORKS
          </h2>
          <div className="mt-10 space-y-8">
            {HOST_STEPS.map((step, i) => (
              <div key={step.title} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-rental-primary/50 bg-rental-elevated">
                    <step.icon className="h-5 w-5 text-rental-primary" />
                  </div>
                  {i < HOST_STEPS.length - 1 && <div className="mt-2 w-px flex-1 border-l border-dashed border-rental-line" />}
                </div>
                <div className="pb-2">
                  <h3 className="font-barlow text-xl font-bold text-rental-foreground">{step.title}</h3>
                  <p className="mt-2 max-w-2xl font-barlow text-sm leading-relaxed text-rental-muted">{step.copy}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button asChild size="lg" variant="outline" className="rounded-none border-rental-primary bg-transparent font-barlow font-semibold uppercase tracking-wide text-rental-primary hover:bg-rental-primary hover:text-rental-primary-foreground">
              <Link to="/rentals/host/apply">Become a Host</Link>
            </Button>
          </div>

          <div className="mt-12 border border-dashed border-rental-primary/50 bg-rental-background p-6">
            <h3 className="flex items-center gap-2 font-barlow text-lg font-bold text-rental-foreground">
              <ShieldCheck className="h-5 w-5 text-rental-primary" /> All trips are protected
            </h3>
            <p className="mt-3 font-barlow text-sm leading-relaxed text-rental-muted">
              Have peace of mind knowing that every trip is covered by third-party state-minimum liability
              insurance, plus Best protection plans that include varying levels of reimbursement for car
              repairs up to the vehicle's actual value in case of damage during a trip.***
            </p>
          </div>
        </div>
      </section>

      {/* After approval timeline */}
      <section className="border-t border-rental-line">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-8 lg:px-12">
          <h2 className="rentals-wordmark text-4xl leading-tight text-rental-foreground sm:text-5xl">
            WHAT HAPPENS AFTER YOUR
            <span className="block text-rental-primary">HOST ACCOUNT IS APPROVED?</span>
          </h2>
          <div className="mt-10 space-y-8">
            {APPROVAL_TIMELINE.map((step, i) => (
              <div key={step.title} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-rental-primary/50 bg-rental-elevated">
                    <step.icon className="h-5 w-5 text-rental-primary" />
                  </div>
                  {i < APPROVAL_TIMELINE.length - 1 && <div className="mt-2 w-px flex-1 border-l border-dashed border-rental-line" />}
                </div>
                <div className="pb-2">
                  <h3 className="font-barlow text-xl font-bold text-rental-foreground">{step.title}</h3>
                  <p className="mt-2 max-w-2xl font-barlow text-sm leading-relaxed text-rental-muted">{step.copy}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button asChild size="lg" className="rounded-none bg-rental-primary font-barlow font-semibold uppercase tracking-wide text-rental-primary-foreground hover:bg-rental-primary/90">
              <Link to="/rentals/host/apply">Become a Host</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How Best helps hosts */}
      <section className="border-t border-rental-line bg-rental-surface">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-8 lg:px-12">
          <h2 className="rentals-wordmark text-4xl text-rental-foreground sm:text-5xl">
            HOW <span className="text-rental-primary">BEST</span> HELPS HOSTS?
          </h2>
          <div className="mt-10 space-y-6">
            {HELP_POINTS.map((point) => (
              <div key={point.title} className="flex gap-5">
                <point.icon className="mt-1 h-5 w-5 shrink-0 text-rental-primary" />
                <div>
                  <h3 className="font-barlow text-lg font-bold text-rental-foreground">{point.title}</h3>
                  <p className="mt-1 max-w-2xl font-barlow text-sm leading-relaxed text-rental-muted">{point.copy}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button asChild size="lg" variant="outline" className="rounded-none border-rental-primary bg-transparent font-barlow font-semibold uppercase tracking-wide text-rental-primary hover:bg-rental-primary hover:text-rental-primary-foreground">
              <Link to="/rentals/host/apply">Become a Host</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Keys to running a successful business */}
      <section className="border-t border-rental-line">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-8 lg:px-12">
          <h2 className="rentals-wordmark text-center text-4xl leading-tight text-rental-foreground sm:text-5xl">
            KEYS TO RUNNING A
            <span className="block text-rental-primary">SUCCESSFUL BUSINESS</span>
            WITH BEST?
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {BUSINESS_CARDS.map((card) => (
              <div
                key={card.title}
                className="border border-rental-line bg-rental-elevated p-6 transition-colors hover:border-rental-primary/60"
              >
                <card.icon className="h-7 w-7 text-rental-primary" />
                <h3 className="mt-4 font-barlow text-lg font-bold text-rental-foreground">{card.title}</h3>
                <p className="mt-2 font-barlow text-sm leading-relaxed text-rental-muted">{card.copy}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Button asChild size="lg" className="rounded-none bg-rental-primary font-barlow font-semibold uppercase tracking-wide text-rental-primary-foreground hover:bg-rental-primary/90">
              <Link to="/rentals/host/apply">Become a Host</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-rental-line bg-rental-surface">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-8 lg:px-12">
          <h2 className="rentals-wordmark text-center text-5xl text-rental-foreground sm:text-6xl">FAQ</h2>
          <Accordion type="single" collapsible className="mt-10">
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem key={item.q} value={`item-${i}`} className="border-rental-line">
                <AccordionTrigger className="text-left font-barlow text-base font-semibold text-rental-foreground hover:no-underline hover:text-rental-primary">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="font-barlow text-sm leading-relaxed text-rental-muted">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <RentalsFooter />
    </div>
  );
};

export default BecomeAHost;
