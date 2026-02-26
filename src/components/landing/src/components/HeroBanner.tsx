import heroVideo from "@/assets/hero-video.mp4";
import heroBg from "@/assets/hero-bg.jpg";

const HeroBanner = () => {
  const scrollDown = () => {
    const next = document.getElementById("referrer-section");
    next?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      {/* Video background with image fallback */}
      <div className="absolute inset-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          poster={heroBg}
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={heroVideo} type="video/mp4" />
        </video>
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-background/60" />
      </div>

      {/* Content overlay */}
      <div className="relative z-10 text-center px-4">
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-wider text-foreground text-shadow-hero mb-8">
          DIMES ONLY WORLD
        </h1>
        <button
          onClick={scrollDown}
          className="animate-pulse-glow mt-4 px-8 py-4 rounded-full bg-primary text-primary-foreground font-bold text-lg transition-colors hover:bg-primary/90"
        >
          Get Started Below ↓
        </button>
      </div>
    </section>
  );
};

export default HeroBanner;
