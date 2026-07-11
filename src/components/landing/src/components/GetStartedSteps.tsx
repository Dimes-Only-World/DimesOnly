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

const GetStartedSteps = () => (
  <section className="py-20 bg-transparent relative z-10">
    <div className="container mx-auto px-4">
      <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-12 whitespace-pre-line leading-tight">
        <span className="text-[#E916D1]">{`3 Easy Steps For
Content Creators
Business Owners
Exotic Dancers
Exotic Females
or
Anyone That Wants
Easy Extra Money`}</span>
      </h2>
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
