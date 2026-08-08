import React, { useEffect, useMemo, useRef, useState } from "react";
import DateOfBirthSelect, { calculateAge } from "@/components/DateOfBirthSelect";
import { usePageVideo } from "@/hooks/usePageVideo";
import { supabase } from "@/integrations/supabase/client";
import { normalizeRefParam } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  const videoRef = useRef<HTMLVideoElement>(null);

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
    try {
      sessionStorage.setItem("ageVerifiedThisSession", "true");
    } catch (e) {
      console.error("Unable to persist age verification", e);
    }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    const name = fullName.trim();
    if (name.length < 2 || name.length > 100) next.fullName = "Please enter your full name";
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) next.phone = "Please enter a valid phone number";
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

  const handleMoreInfo = async () => {
    await recordAction("more_information");
    markVerified();
    onVerified();
  };

  const inputClass =
    "w-full rounded-lg bg-white/10 border border-white/30 text-white placeholder-white/50 px-4 py-2.5 text-sm focus:outline-none focus:border-yellow-400";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 overflow-y-auto p-3 sm:p-4 flex items-start sm:items-center justify-center">
      <div className="bg-gray-900 text-white p-4 sm:p-8 rounded-2xl border-4 border-orange-500 shadow-2xl max-w-4xl w-full my-auto">

        {step === "warning" && (
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className="flex-shrink-0 w-full sm:w-auto">
              <video
                autoPlay
                muted
                loop
                playsInline
                className="w-full sm:w-64 h-36 sm:h-48 object-cover rounded-lg border-2 border-orange-500"
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
                  onChange={(e) => setFullName(e.target.value)}
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
                  maxLength={25}
                  onChange={(e) => setPhone(e.target.value)}
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
              className="w-full rounded-lg border-2 border-orange-500 bg-black aspect-video"
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
                Continue Registration
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
      </div>
    </div>
  );
};

export default AgeVerification;
