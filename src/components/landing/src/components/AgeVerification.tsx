import { useState, useEffect } from "react";

const AgeVerification = () => {
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("age-verified");
    if (consent === "true") setVerified(true);
  }, []);

  const handleEnter = () => {
    localStorage.setItem("age-verified", "true");
    setVerified(true);
  };

  if (verified) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl rounded-2xl border-2 border-primary bg-card overflow-hidden flex flex-col md:flex-row">
        {/* Left side — branding placeholder */}
        <div className="md:w-1/2 bg-background flex items-center justify-center p-8 min-h-[200px]">
          <div className="text-center">
            <h2 className="text-3xl font-black tracking-wider text-foreground">
              DIMES<br />ONLY
            </h2>
            <p className="text-xs text-muted-foreground mt-2 tracking-widest uppercase">Network</p>
            {/* Replace with uploaded branding image later */}
            <div className="mt-4 w-32 h-32 mx-auto rounded-xl bg-muted/30 border border-border flex items-center justify-center">
              <span className="text-muted-foreground text-xs">Brand Image</span>
            </div>
          </div>
        </div>

        {/* Right side — warning & button */}
        <div className="md:w-1/2 p-8 flex flex-col justify-center">
          <h3 className="text-xl font-bold text-primary mb-4">
            WARNING: This site is for adults only!
          </h3>
          <p className="text-foreground text-sm leading-relaxed mb-6">
            By entering this website, I acknowledge that I am 18 years old or older
            and agree to the Terms of Service, which are available per request at the
            footer of the website.
          </p>
          <button
            onClick={handleEnter}
            className="w-full py-3 px-6 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            ENTER - I am 18 years old or older
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgeVerification;
