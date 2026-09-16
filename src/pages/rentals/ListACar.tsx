import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  CarFront,
  DollarSign,
  FileText,
  LifeBuoy,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  TrendingUp,
  Wrench,
} from "lucide-react";
import RentalsFooter from "@/components/rentals/RentalsFooter";

const SCHEDULE_CALL_URL =
  "https://forms.zohopublic.com/life1consultingcom/form/BestVehicleApplication1/formperma/NEo9COacNFYLprsXe56MgiJ772zuhzaS416FqnuDaVQ";

const ESTIMATOR_MAKES: Record<string, string[]> = {
  Tesla: ["Model 3", "Model Y", "Model S"],
  BMW: ["3 Series", "5 Series", "X5"],
  "Mercedes-Benz": ["C-Class", "E-Class", "GLE"],
  Toyota: ["Camry", "Corolla", "RAV4"],
  Honda: ["Accord", "Civic", "CR-V"],
};

const ESTIMATOR_YEARS = ["2024", "2023", "2022", "2021", "2020", "2019"];

const EARNINGS_EXAMPLES = [
  {
    name: "Tesla Model Y",
    year: "2024",
    dayRate: "$74/day",
    occupancy: "24 days/mo",
    ownerPlan: "60*",
    ownerRevenue: "$991/mo",
    annualRevenue: "$10,900*",
    firstMonth: "$900**",
  },
  {
    name: "BMW 5 Series",
    year: "2023",
    dayRate: "$95/day",
    occupancy: "22 days/mo",
    ownerPlan: "60*",
    ownerRevenue: "$1,122/mo",
    annualRevenue: "$13,460*",
    firstMonth: "$1,100**",
  },
  {
    name: "Toyota Camry",
    year: "2022",
    dayRate: "$58/day",
    occupancy: "24 days/mo",
    ownerPlan: "60*",
    ownerRevenue: "$776/mo",
    annualRevenue: "$9,310*",
    firstMonth: "$750**",
  },
];

const STEPS = [
  {
    icon: FileText,
    title: "Estimate your earnings",
    copy: "Use the Earnings Estimator to see your car's potential and schedule an appointment.",
  },
  {
    icon: CalendarCheck,
    title: "Drop off your vehicle",
    copy: "Bring your car to Best or get it picked up at your location.",
  },
  {
    icon: DollarSign,
    title: "Start Earning Money",
    copy: "Sign the agreement and let Best handle everything while you receive monthly payouts.",
  },
];

const GOOD_HANDS = [
  {
    icon: ShieldCheck,
    title: "Insurance Included",
    copy: "Your vehicle is covered for up to $750,000*** in third-party liability insurance and repair reimbursement up to its actual cash value** during a trip.",
  },
  {
    icon: ThumbsUp,
    title: "Verified drivers",
    copy: "We take the safety of our fleet seriously and let only well-verified drivers get behind the wheel.",
  },
  {
    icon: LifeBuoy,
    title: "Support",
    copy: "Our customer support team handles reservations, provides roadside assistance, and offers dedicated help for car owners.",
  },
  {
    icon: Sparkles,
    title: "Professional Auto Care",
    copy: "Our drivers always get cars in excellent condition, thanks to thorough cleaning after each trip and regular professional detailing.",
  },
  {
    icon: Wrench,
    title: "Repairs & Maintenance",
    copy: "If your car needs repairs or maintenance, the work will be completed promptly at certified facilities, with thorough inspections by our hosts before and after the service.",
  },
];

const ABOUT_BEST = [
  "Best is a car-sharing company where car owners earn while we handle all management.",
  "Our built in-house platform operates independently from aggregators - every booking is made directly through Best.",
  "Active vehicles achieve over 80% monthly utilization, ensuring predictable, stable returns for owners.",
  "Our Advanced Driver Verification system protects your vehicles and keeps them on the road, minimizing risk and maximizing profits.",
  "Best's mission is to help car owners earn truly passive income while empowering everyone to get behind the wheel.",
];

const FAQ_ITEMS = [
  {
    q: "What is Best?",
    a: "Best is a car sharing platform that allows you to easily profit from sharing your vehicle. Unlike other car-sharing platforms, we do all the hard work for you. This way, you just earn profit and spend your time on the things you really love.",
  },
  {
    q: "Does my car qualify for Best?",
    a: "Best only accepts vehicles with strong earning potential. You can see the full list of eligible makes, models, and years in the Estimator on the List a Car page.\n\nVehicle requirements\n1. 2019 or newer model\n2. Less than 140,000 miles\n3. Clean title\n4. Good exterior and interior condition\n5. No maintenance issues\n6. No open recalls\n7. Valid registration\n\nIf you believe your car is a great fit for Best but you do not see it in the Estimator, please contact our support team.",
  },
  {
    q: "How do you estimate my earnings?",
    a: "Your earnings are estimated based on Best data from the last 6 months using this formula:\n\nAverage gross rental revenue - Best management fee = Your earnings\n\nGross rental revenue includes the rental rate, unlimited mileage fees, and any additional usage fees. It does not include extras, cleaning or delivery fees, or other reimbursements.\n\nWant to estimate your earnings? Try our Earnings Estimator above!",
  },
  {
    q: "What is Best's management fee?",
    a: "You can choose between the 70, 60, or 50 plans. Best's management fee ranges from 30% to 50%.",
  },
  {
    q: "What about coverage?",
    a: "During each trip, your car is provided with collision and liability coverage by the car-sharing platform it uses for trips. Between trips, your vehicle will be parked in a secured parking lot. Nevertheless, we advise you to maintain your personal or commercial car coverage to adhere to state guidelines.",
  },
  {
    q: "What if my car got damaged during a trip?",
    a: "Best will handle every step of the repair process from start to finish and will conduct inspections before and after the work is completed.",
  },
  {
    q: "Who is responsible for maintenance?",
    a: "Best will coordinate all maintenance routines.\n\nHowever, the cost of maintenance remains the full responsibility of the vehicle owner.\n\nBest may charge the vehicle owner a fee for any errands related to vehicle maintenance or repairs.",
  },
  {
    q: "What is the minimum placement term?",
    a: "The minimum vehicle placement term is 30 days. After that, you can request your car back at any time.",
  },
  {
    q: "When do I get my payment?",
    a: "You'll receive your payment on the 10th of each month, covering earnings from the previous month.",
  },
  {
    q: "How do I get info about my car condition?",
    a: "Each month, you will receive a statement from us containing all relevant details about your vehicle's current status, including mileage, maintenance, and completed repairs. We are also developing an Owner's Dashboard that will allow you to track your vehicle information in real time.",
  },
  {
    q: "What if my car gets a ticket?",
    a: "You don't have to worry. If your car receives a parking ticket, citation, or any other violation during a trip, we'll take care of everything promptly and either pay it in full or transfer liability to prevent any inconvenience for you.",
  },
  {
    q: "What cities does Best operate in?",
    a: "Best currently operates in the Los Angeles area. Contact us if you're interested in launching Best in your city.",
  },
];

const FOOTNOTES = [
  "Please note: Be informed of existing peer-to-peer car sharing legislation in California that limits the amount of income you are supposed to earn from car sharing in certain scenarios. For more details about these regulations and to determine if car sharing is a good fit for you, check out this article.",
  "*Figures represent the average Best earnings for all California-based vehicles with at least three distinct vehicles between 01/01/2025 and 01/01/2026. Vehicles have a fair market value ranging from $10,000 to $130,000 and are model years 2019-2026. Earnings do not account for costs such as vehicle maintenance, repairs, insurance, and deductibles.",
  "** If your first-month revenue is less than this amount, Best pays the difference.",
  "*** Insurance is provided under a policy issued to Best by a third-party insurance company. Terms, conditions, and exclusions apply. For questions or information about the insurance included in protection plans, consumers may contact Best at claims@dimesonly.world. Liability coverage is up to $750,000. The insurance coverage limit is reduced by any amounts available and paid under any other policy issued to the guest.",
];

const ListACar: React.FC = () => {
  const [make, setMake] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [year, setYear] = useState<string>("");
  const [estimate, setEstimate] = useState<string | null>(null);
  const [slide, setSlide] = useState(0);

  const models = useMemo(() => (make ? ESTIMATOR_MAKES[make] || [] : []), [make]);

  const runEstimate = () => {
    if (!make || !model || !year) {
      setEstimate(null);
      return;
    }
    const base = 950 + (Number(year) - 2019) * 45 + model.length * 3;
    setEstimate(`$${base.toLocaleString("en-US")}/mo`);
  };

  const example = EARNINGS_EXAMPLES[slide];

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

      {/* Hero + Estimator */}
      <section className="border-y border-rental-line bg-rental-surface">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-14 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:px-12 lg:py-20">
          <div className="flex flex-col justify-center">
            <p className="mb-3 flex items-center gap-2 font-barlow text-xs font-semibold uppercase text-rental-primary">
              <span className="h-px w-8 bg-rental-primary" /> List a Car
            </p>
            <h1 className="rentals-wordmark text-5xl leading-[0.92] text-rental-foreground sm:text-6xl lg:text-7xl">
              EARN <span className="text-rental-primary">PASSIVE INCOME</span>
              <span className="block">WITH YOUR CAR.</span>
            </h1>
            <p className="mt-5 max-w-lg font-barlow text-base text-rental-muted sm:text-lg">
              We handle everything and deliver monthly payouts.
            </p>
          </div>

          <div className="flex items-center">
            <div className="w-full rounded-none border border-rental-line bg-rental-elevated p-6 sm:p-8">
              <h2 className="font-barlow text-2xl font-bold text-rental-foreground">Estimate your earnings</h2>
              <div className="mt-6 space-y-4">
                <Select value={make} onValueChange={(v) => { setMake(v); setModel(""); setEstimate(null); }}>
                  <SelectTrigger className="w-full rounded-none border-rental-line bg-rental-background font-barlow text-rental-foreground">
                    <SelectValue placeholder="Make" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-rental-line bg-rental-elevated text-rental-foreground">
                    {Object.keys(ESTIMATOR_MAKES).map((m) => (
                      <SelectItem key={m} value={m} className="font-barlow">{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={model} onValueChange={(v) => { setModel(v); setEstimate(null); }} disabled={!make}>
                  <SelectTrigger className="w-full rounded-none border-rental-line bg-rental-background font-barlow text-rental-foreground">
                    <SelectValue placeholder="Model" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-rental-line bg-rental-elevated text-rental-foreground">
                    {models.map((m) => (
                      <SelectItem key={m} value={m} className="font-barlow">{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={year} onValueChange={(v) => { setYear(v); setEstimate(null); }}>
                  <SelectTrigger className="w-full rounded-none border-rental-line bg-rental-background font-barlow text-rental-foreground">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-rental-line bg-rental-elevated text-rental-foreground">
                    {ESTIMATOR_YEARS.map((y) => (
                      <SelectItem key={y} value={y} className="font-barlow">{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={runEstimate}
                  className="w-full rounded-none bg-rental-primary font-barlow font-semibold uppercase tracking-wide text-rental-primary-foreground hover:bg-rental-primary/90"
                >
                  Estimate
                </Button>
                {estimate && (
                  <p className="text-center font-barlow text-lg font-bold text-rental-primary">
                    Estimated earnings: {estimate}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Earnings examples + Your steps to earn */}
      <section>
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-16 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:px-12">
          <div>
            <div className="inline-block bg-rental-primary px-4 py-1.5 font-barlow text-sm font-bold uppercase tracking-wide text-rental-primary-foreground">
              Earnings examples
            </div>
            <div className="mt-4 border border-rental-line bg-rental-elevated p-6">
              <h3 className="font-barlow text-xl font-bold text-rental-foreground">
                {example.name}
                <span className="ml-2 font-barlow text-base font-medium text-rental-muted">{example.year}</span>
              </h3>
              <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 font-barlow">
                <div>
                  <p className="text-xs uppercase tracking-wide text-rental-muted">Rental rate</p>
                  <p className="text-lg font-bold text-rental-foreground">{example.dayRate}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-rental-muted">Owner Plan</p>
                  <p className="text-lg font-bold text-rental-foreground">{example.ownerPlan}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-rental-muted">Occupancy</p>
                  <p className="text-lg font-bold text-rental-foreground">{example.occupancy}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-rental-muted">Owner Revenue</p>
                  <p className="text-lg font-bold text-rental-foreground">{example.ownerRevenue}</p>
                </div>
              </div>
              <div className="mt-4 space-y-1 border-t border-rental-line pt-4 font-barlow text-sm">
                <p className="flex items-center gap-2 text-rental-foreground">
                  <ShieldCheck className="h-4 w-4 text-rental-primary" />
                  Annual Revenue: <strong>{example.annualRevenue}</strong>
                </p>
                <p className="flex items-center gap-2 text-rental-foreground">
                  <BadgeCheck className="h-4 w-4 text-rental-primary" />
                  First Month Guaranteed: <strong>{example.firstMonth}</strong>
                </p>
              </div>
              <div className="mt-5 flex justify-center gap-2">
                {EARNINGS_EXAMPLES.map((e, i) => (
                  <button
                    key={e.name}
                    type="button"
                    aria-label={`Show ${e.name}`}
                    onClick={() => setSlide(i)}
                    className={`h-2 w-2 rounded-full transition-colors ${i === slide ? "bg-rental-primary" : "bg-rental-line"}`}
                  />
                ))}
              </div>
            </div>
            <div className="mt-5 text-center">
              <Button asChild variant="outline" className="rounded-none border-rental-primary bg-transparent font-barlow font-semibold uppercase tracking-wide text-rental-primary hover:bg-rental-primary hover:text-rental-primary-foreground">
                <a href={SCHEDULE_CALL_URL} target="_blank" rel="noopener noreferrer">Plans &amp; Fees</a>
              </Button>
            </div>
            <p className="mt-3 text-center font-barlow text-xs text-rental-muted">
              *Estimated earnings are based on Best data using the 60 Plan and are not guaranteed.
            </p>
          </div>

          <div className="flex flex-col justify-center">
            <h2 className="rentals-wordmark text-4xl text-rental-foreground sm:text-5xl">
              YOUR STEPS <span className="text-rental-primary">TO EARN</span>
            </h2>
            <div className="mt-8 space-y-7">
              {STEPS.map((step, i) => (
                <div key={step.title} className="flex gap-5">
                  <span className="rentals-wordmark shrink-0 text-5xl leading-none text-rental-primary">{i + 1}</span>
                  <div>
                    <h3 className="font-barlow text-lg font-bold text-rental-foreground">{step.title}</h3>
                    <p className="mt-1 max-w-md font-barlow text-sm leading-relaxed text-rental-muted">{step.copy}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-6 font-barlow text-xs text-rental-muted">
              * You may request your car back at any time after the first 30 days.
            </p>
            <div className="mt-6">
              <Button asChild size="lg" className="rounded-none bg-rental-primary font-barlow font-semibold uppercase tracking-wide text-rental-primary-foreground hover:bg-rental-primary/90">
                <a href={SCHEDULE_CALL_URL} target="_blank" rel="noopener noreferrer">
                  <PhoneCall className="mr-2 h-4 w-4" /> Schedule a Call
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Your car is in good hands */}
      <section className="border-t border-rental-line bg-rental-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8 lg:px-12">
          <h2 className="rentals-wordmark text-center text-4xl text-rental-foreground sm:text-5xl">
            YOUR CAR IS IN <span className="text-rental-primary">GOOD HANDS</span>
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {GOOD_HANDS.map((item) => (
              <div key={item.title} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center border border-rental-primary/50 bg-rental-elevated">
                  <item.icon className="h-6 w-6 text-rental-primary" />
                </div>
                <h3 className="mt-4 font-barlow text-lg font-bold text-rental-foreground">{item.title}</h3>
                <p className="mx-auto mt-2 max-w-xs font-barlow text-sm leading-relaxed text-rental-muted">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Best */}
      <section className="border-t border-rental-line">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-8 lg:px-12">
          <h2 className="rentals-wordmark text-4xl text-rental-foreground sm:text-5xl">
            ABOUT <span className="text-rental-primary">BEST</span>
          </h2>
          <ul className="mt-8 space-y-4">
            {ABOUT_BEST.map((point) => (
              <li key={point} className="flex gap-3 font-barlow text-sm leading-relaxed text-rental-muted sm:text-base">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-rental-primary" />
                {point}
              </li>
            ))}
          </ul>
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
                <AccordionContent className="whitespace-pre-line font-barlow text-sm leading-relaxed text-rental-muted">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="mt-10 space-y-4">
            {FOOTNOTES.map((note) => (
              <p key={note.slice(0, 24)} className="font-barlow text-xs leading-relaxed text-rental-muted">
                {note}
              </p>
            ))}
          </div>
        </div>
      </section>

      <RentalsFooter />
    </div>
  );
};

export default ListACar;
