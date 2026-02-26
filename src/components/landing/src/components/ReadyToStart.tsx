import { Link } from "react-router-dom";

const ReadyToStart = () => (
  <section className="py-20 bg-background">
    <div className="container mx-auto px-4 text-center">
      <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
        READY TO GET <span className="text-[#E916D1]">STARTED</span>?
      </h2>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
        <Link
          to="/register"
          className="px-10 py-4 rounded-full font-bold bg-[#E916D1] text-black hover:bg-[#E916D1]/90 transition-colors text-lg"
        >
          START FREE
        </Link>
        <Link
          to="/login"
          className="px-10 py-4 rounded-full font-bold border border-[#E916D1] text-[#E916D1] hover:bg-[#E916D1]/10 transition-colors text-lg"
        >
          LOGIN
        </Link>
      </div>
      <p className="text-muted-foreground text-sm">
        Join thousands of entertainers already earning on Dimes Only Network
      </p>
    </div>
  </section>
);

export default ReadyToStart;
