const ReadyToStart = () => {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  const registerUrl = ref ? `/register?ref=${encodeURIComponent(ref)}` : "/register";
  const loginUrl = ref ? `/login?ref=${encodeURIComponent(ref)}` : "/login";

  return (
    <section className="py-20 bg-transparent relative z-10">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
          JOIN FREE <span className="text-[#E916D1]">NOW</span>
        </h2>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
          <a
            href={registerUrl}
            className="px-10 py-4 rounded-full font-bold bg-[#E916D1] text-white hover:bg-[#E916D1]/90 transition-colors text-lg"
          >
            START FREE
          </a>
          <a
            href={loginUrl}
            className="px-10 py-4 rounded-full font-bold border border-[#E916D1] text-[#E916D1] hover:bg-[#E916D1]/10 transition-colors text-lg"
          >
            MEMBERS LOGIN
          </a>
        </div>
        <p className="text-white text-sm">
          Join thousands of entertainers already earning on Dimes Only Network
        </p>
      </div>
    </section>
  );
};

export default ReadyToStart;
