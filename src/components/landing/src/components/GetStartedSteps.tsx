const steps = [
  {
    num: "1",
    title: "Sign Up For Free",
    desc: "Create your account in seconds — it's completely free to join the Dimes Only Network.",
  },
  {
    num: "2",
    title: "Fill Out Registration Form",
    desc: "Complete your profile with your information to start connecting with fans and performers.",
  },
  {
    num: "3",
    title: "Transfer Your Followers",
    desc: "Bring your existing audience to the platform and start earning right away.",
  },
];

const AUDIENCES = [
  "Content Creators",
  "Business Owners",
  "Exotic Dancers",
  "Exotic Females",
];

const GetStartedSteps = () => (
  <section className="py-24 bg-transparent relative z-10">
    <div className="container mx-auto px-4">
      <div className="max-w-3xl mx-auto text-center mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#E916D1]/40 bg-[#E916D1]/10 mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-[#E916D1] animate-pulse" />
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-[#E916D1]">
            Get Started
          </span>
        </div>

        <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.05]">
          Three simple steps to
          <span className="block mt-2 bg-gradient-to-r from-[#E916D1] via-[#ff5ad9] to-[#E916D1] bg-clip-text text-transparent">
            start earning today
          </span>
        </h2>

        <p className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed">
          Built for creators, entrepreneurs, and anyone ready to turn their
          influence into effortless income.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {AUDIENCES.map((label) => (
            <span
              key={label}
              className="px-3 py-1 rounded-full text-xs md:text-sm font-medium text-foreground/80 border border-white/10 bg-white/5 backdrop-blur-sm"
            >
              {label}
            </span>
          ))}
          <span className="px-3 py-1 rounded-full text-xs md:text-sm font-semibold text-[#E916D1] border border-[#E916D1]/40 bg-[#E916D1]/10">
            + Anyone ready for extra income
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {steps.map((step) => (
          <div
            key={step.num}
            className="rounded-xl border border-[#E916D1]/30 bg-card/80 p-8 text-center shadow-lg shadow-[#E916D1]/10 transition-transform duration-300 hover:-translate-y-2"
          >
            <div className="text-5xl font-black text-primary-light mb-4">{step.num}</div>
            <h3 className="text-xl font-bold mb-3 text-foreground">{step.title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default GetStartedSteps;
