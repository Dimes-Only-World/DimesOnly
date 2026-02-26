import { Shield, Lock, CreditCard } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "SSL Encrypted",
    desc: "All data is encrypted with industry-standard SSL technology.",
    color: "text-primary-light",
  },
  {
    icon: Lock,
    title: "Privacy Protected",
    desc: "Your personal data is safeguarded and never shared without consent.",
    color: "text-primary-bright",
  },
  {
    icon: CreditCard,
    title: "Secure Payments",
    desc: "All financial transactions are protected with advanced security protocols.",
    color: "text-primary-muted",
  },
];

const paymentBrands = ["VISA", "MasterCard", "AMEX"];

const SecurePlatform = () => (
  <section className="py-20 bg-card">
    <div className="container mx-auto px-4">
      <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-12">
        <span className="text-[#E916D1]">SECURE</span> & TRUSTED PLATFORM
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
        {features.map((f) => (
          <div key={f.title} className="rounded-xl border border-[#E916D1]/30 bg-card/80 p-8 text-center shadow-lg shadow-[#E916D1]/10">
            <f.icon className={`w-10 h-10 mx-auto mb-4 ${f.color}`} />
            <h3 className="text-lg font-bold text-foreground mb-2">{f.title}</h3>
            <p className="text-muted-foreground text-sm">{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-6">
        {paymentBrands.map((brand) => (
          <div
            key={brand}
            className="px-5 py-2 rounded-lg border border-border bg-card text-muted-foreground text-sm font-semibold"
          >
            {brand}
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default SecurePlatform;
