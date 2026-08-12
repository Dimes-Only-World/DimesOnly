import React, { useEffect, useMemo, useRef, useState } from "react";
import DateOfBirthSelect, { calculateAge } from "@/components/DateOfBirthSelect";
import { usePageVideo } from "@/hooks/usePageVideo";
import { supabase } from "@/integrations/supabase/client";
import { normalizeRefParam } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ShortFormBackgroundCarousel from "@/components/ShortFormBackgroundCarousel";


interface AgeVerificationProps {
  onVerified: () => void;
}

const FALLBACK_VIDEO =
  "https://dimesonlyworld.s3.us-east-2.amazonaws.com/opening+intro.webm";

type Step = "warning" | "form" | "video";

interface Referrer {
  username: string;
  photo: string | null;
}

const AgeVerification: React.FC<AgeVerificationProps> = ({ onVerified }) => {
  const [step, setStep] = useState<Step>("warning");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [videoEnded, setVideoEnded] = useState(false);
  const [referrer, setReferrer] = useState<Referrer | null>(null);
  const [showContact, setShowContact] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [checking, setChecking] = useState(false);
  const [showReturning, setShowReturning] = useState(false);

  const { videoUrl: explainerUrl } = usePageVideo("age_gate_explainer");

  const refCode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return normalizeRefParam(params.get("ref")) || "";
  }, []);

  // Look up the referrer named in the ?ref= parameter so we can greet the visitor.
  useEffect(() => {
    if (!refCode || refCode.toLowerCase() === "company") return;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("public_user_profiles")
        .select("username, profile_photo, front_page_photo, banner_photo")
        .ilike("username", refCode)
        .maybeSingle();

      if (cancelled || error || !data) return;
      setReferrer({
        username: data.username,
        photo: data.front_page_photo || data.profile_photo || data.banner_photo || null,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [refCode]);


  const markVerified = () => {
    // Intentionally not persisted: age verification is required on every visit.
  };


  const validate = () => {
    const next: Record<string, string> = {};
    const name = fullName.trim();
    if (name.length < 2 || name.length > 100) next.fullName = "Please enter your full name";
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) next.phone = "Please enter a 10-digit phone number";
    else if (digits.startsWith("1")) next.phone = "Phone number cannot start with 1";

    if (!dob) next.dob = "Date of birth is required";
    else if ((calculateAge(dob) ?? 0) < 18) next.dob = "You must be at least 18 years old to enter";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("submit-age-gate-lead", {
        body: {
          fullName: fullName.trim(),
          phone: phone.trim(),
          dateOfBirth: dob,
          referralCode: refCode || null,
        },
      });
      if (error) throw error;
      if (data?.leadId) setLeadId(data.leadId);
    } catch (err) {
      // Never block the visitor if the lead could not be stored.
      console.error("Age gate lead submission failed", err);
    } finally {
      setSubmitting(false);
      markVerified();
      setStep("video");
    }
  };

  const recordAction = async (action: "continued_registration" | "more_information") => {
    if (!leadId) return;
    try {
      await supabase.functions.invoke("submit-age-gate-lead", { body: { leadId, action } });
    } catch (err) {
      console.error("Unable to record age gate action", err);
    }
  };

  const handleContinueRegistration = async () => {
    await recordAction("continued_registration");
    try {
      sessionStorage.setItem(
        "ageGatePrefill",
        JSON.stringify({ fullName: fullName.trim(), phone: phone.trim(), dateOfBirth: dob }),
      );
    } catch (e) {
      console.error("Unable to store prefill data", e);
    }
    markVerified();
    const query = refCode ? `?ref=${encodeURIComponent(refCode)}` : "";
    window.location.href = `/register${query}`;
  };

  // Returning visitor: verify their name + phone already exist in the database.
  const handleAlreadySubmitted = async () => {
    const next: Record<string, string> = {};
    if (fullName.trim().length < 2) next.fullName = "Please enter your full name";
    const lookupDigits = phone.replace(/\D/g, "");
    if (lookupDigits.length !== 10) next.phone = "Please enter a 10-digit phone number";
    else if (lookupDigits.startsWith("1")) next.phone = "Phone number cannot start with 1";

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("submit-age-gate-lead", {
        body: { lookup: true, fullName: fullName.trim(), phone: phone.trim() },
      });
      if (error) throw error;

      if (data?.found) {
        if (data.leadId) setLeadId(data.leadId);
        markVerified();
        setShowReturning(true);
      } else {
        setErrors({ lookup: "The information is incorrect — click Submit to continue." });
      }
    } catch (err) {
      console.error("Age gate lookup failed", err);
      setErrors({ lookup: "We couldn't verify your details. Please click Submit to continue." });
    } finally {
      setChecking(false);
    }
  };

  const handleStartFree = async () => {
    setShowReturning(false);
    await handleContinueRegistration();
  };

  const handleWatchIntro = () => {
    setShowReturning(false);
    setStep("video");
  };

  const handleMoreInfo = async () => {
    await recordAction("more_information");
    setShowContact(true);
  };

  const closeContact = () => {
    markVerified();
    setShowContact(false);
    onVerified();
  };

  // Format as (111) 111-1111 while typing.
  const formatPhone = (value: string) => {
    let d = value.replace(/\D/g, "").slice(0, 11);
    // Drop a leading 1 so the area code can never start with 1.
    while (d.startsWith("1")) d = d.slice(1);
    d = d.slice(0, 10);

    if (d.length <= 3) return d;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  };

  // Capitalize first letter of each word in the full name.
  const formatFullName = (value: string) =>
    value
      .replace(/\s+/g, " ")
      .split(" ")
      .map((word) => (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : ""))
      .join(" ");

  const inputClass =
    "w-full rounded-lg bg-white/10 border border-white/30 text-white placeholder-white/50 px-4 py-2.5 text-sm focus:outline-none focus:border-yellow-400";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 overflow-y-auto p-3 sm:p-4 flex items-start sm:items-center justify-center">
      {step === "form" && <ShortFormBackgroundCarousel className="fixed inset-0 z-0" />}
      <div
        className={`relative z-10 text-white p-4 sm:p-8 rounded-2xl border-4 border-orange-500 shadow-2xl max-w-4xl w-full my-auto ${
          step === "form" ? "bg-gray-900/75 backdrop-blur-md" : "bg-gray-900"
        }`}
      >


        {step === "warning" && (
          <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6">
            <div className="w-full sm:w-1/3 shrink-0">
              <video
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-auto object-contain bg-black rounded-lg border-2 border-orange-500"
              >
                <source src={FALLBACK_VIDEO} type="video/webm" />
              </video>
            </div>



            <div className="text-center flex-1">
              <h2 className="text-orange-500 text-xl sm:text-2xl font-bold mb-4">
                WARNING: This site is for adults only!
              </h2>
              <p className="mb-6 text-xs sm:text-sm leading-relaxed">
                By entering this website, I acknowledge that I am 18 years old or older and agree to the Terms of
                Service, which are available per request at the footer of the website.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => setStep("form")}
                  type="button"
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition-colors text-sm sm:text-base"
                >
                  ENTER - I am 18 years old or older
                </button>
                <button
                  onClick={() => {
                    window.location.href = "/login";
                  }}
                  type="button"
                  className="bg-pink-600 hover:bg-pink-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition-colors text-sm sm:text-base"
                >
                  MEMBERS LOGIN
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "form" && (
          <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
            {referrer && (
              <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-white/5 border border-orange-500/40">
                <Avatar className="h-20 w-20 border-2 border-orange-500">
                  {referrer.photo && <AvatarImage src={referrer.photo} alt={`@${referrer.username}`} />}
                  <AvatarFallback />
                </Avatar>
                <div className="min-w-0">
                  <p className="text-white/70 text-xs uppercase tracking-wide">You were invited by</p>
                  <p className="text-lg sm:text-xl font-bold text-orange-400 truncate">@{referrer.username}</p>
                </div>
              </div>
            )}

            <h2 className="text-orange-500 text-xl sm:text-2xl font-bold mb-2 text-center">
              Let&apos;s get you started
            </h2>
            <p className="text-white/70 text-xs sm:text-sm mb-6 text-center">
              Enter your details to watch a short introduction video.
            </p>


            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Name</label>
                <input
                  type="text"
                  value={fullName}
                  maxLength={100}
                  onChange={(e) => setFullName(formatFullName(e.target.value))}
                  placeholder="Your full name"
                  className={inputClass}
                />
                {errors.fullName && <p className="text-red-400 text-xs mt-1">{errors.fullName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  inputMode="tel"
                  maxLength={14}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="(555) 123-4567"
                  className={inputClass}
                />
                {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Date of Birth</label>
                <DateOfBirthSelect value={dob} onChange={setDob} error={errors.dob} />
              </div>
            </div>

            {errors.lookup && (
              <p className="text-red-400 text-xs sm:text-sm mt-4 text-center">{errors.lookup}</p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                type="button"
                onClick={() => setStep("warning")}
                className="sm:w-auto px-5 py-3 rounded-lg border border-white/30 text-white/80 hover:bg-white/10 transition-colors text-sm font-semibold"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-6 py-3 rounded-lg font-semibold transition-colors text-sm sm:text-base"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>

            <button
              type="button"
              onClick={handleAlreadySubmitted}
              disabled={checking}
              className="w-full mt-3 px-6 py-3 rounded-lg border border-orange-500/60 text-orange-300 hover:bg-orange-500/10 disabled:opacity-60 transition-colors text-sm font-semibold"
            >
              {checking ? "Checking..." : "Already Submitted"}
            </button>

          </form>
        )}

        {step === "video" && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-orange-500 text-xl sm:text-2xl font-bold mb-4 text-center">
              Watch this quick introduction
            </h2>

            <video
              ref={videoRef}
              key={explainerUrl || FALLBACK_VIDEO}
              autoPlay
              playsInline
              controls
              controlsList="nodownload noplaybackrate"
              onEnded={() => setVideoEnded(true)}
              className="w-full h-auto rounded-lg border-2 border-orange-500 bg-black object-contain"
            >
              <source src={explainerUrl || FALLBACK_VIDEO} />
            </video>

            {!videoEnded && (
              <p className="text-white/60 text-xs sm:text-sm mt-4 text-center">
                Your options will unlock once the video finishes.
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                type="button"
                disabled={!videoEnded}
                onClick={handleContinueRegistration}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-colors text-sm sm:text-base"
              >
                Complete Registration Free
              </button>
              <button
                type="button"
                disabled={!videoEnded}
                onClick={handleMoreInfo}
                className="flex-1 bg-pink-600 hover:bg-pink-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-colors text-sm sm:text-base"
              >
                For more information click here
              </button>
            </div>
          </div>
        )}
        {showReturning && (
          <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
            <div className="bg-gray-900 text-white p-6 sm:p-8 rounded-2xl border-2 border-orange-500 shadow-2xl max-w-md w-full text-center">
              <h3 className="text-orange-500 text-lg sm:text-xl font-bold mb-2">Welcome back!</h3>
              <p className="text-white/70 text-sm mb-6">
                We found your details. What would you like to do next?
              </p>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleWatchIntro}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors text-sm sm:text-base"
                >
                  Watch Intro Video
                </button>
                <button
                  type="button"
                  onClick={handleStartFree}
                  className="w-full bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors text-sm sm:text-base"
                >
                  Start Free
                </button>
              </div>
            </div>
          </div>
        )}

        {showContact && (
          <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
            <div className="bg-gray-900 text-white p-6 sm:p-8 rounded-2xl border-2 border-orange-500 shadow-2xl max-w-md w-full text-center">
              <h3 className="text-orange-500 text-lg sm:text-xl font-bold mb-2">Get in Touch</h3>
              <p className="text-white/70 text-sm mb-6">
                Have questions? Text us or reach out on WhatsApp and we&apos;ll get back to you shortly.
              </p>

              <div className="mb-6">
                <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Contact Number</p>
                <a
                  href="tel:+13106920921"
                  className="text-xl sm:text-2xl font-bold text-white hover:text-orange-400 transition-colors"
                >
                  (310) 692-0921
                </a>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="https://wa.me/13106920921"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors text-sm sm:text-base"
                  onClick={closeContact}
                >
                  Open WhatsApp
                </a>
                <button
                  type="button"
                  onClick={closeContact}
                  className="flex-1 bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors text-sm sm:text-base"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgeVerification;
