const cards = [
  {
    title: "Diamond Plus Memberships",
    target: "Exotic Females & Strippers",
    remaining: 47,
  },
  {
    title: "Silver Plus Memberships",
    target: "Normal Females & Males",
    remaining: 123,
  },
];

const IncentivePositions = () => (
  <section className="py-20 bg-background">
    <div className="container mx-auto px-4">
      <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-12">
        Incentive Positions Available Now
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-xl border border-border bg-card p-8 text-center"
          >
            <h3 className="text-xl font-bold mb-2 text-primary-bright">
              {card.title}
            </h3>
            <p className="text-muted-foreground text-sm mb-6">{card.target}</p>
            <div className="text-6xl font-black text-primary-light mb-2">{card.remaining}</div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider">
              Lifetime Positions Left
            </p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default IncentivePositions;
