import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertCircle, Camera, CheckCircle, FileText, ShieldCheck, Upload } from "lucide-react";
import MembershipAgreementBody from "@/components/MembershipAgreementBody";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

type Tier = "diamond_plus" | "silver_plus" | "elite_plus";

interface Props {
  tier: Tier;
  agreementTitle?: string;
  onSubmitted?: () => void;
}

const TIER_LABEL: Record<Tier, string> = {
  diamond_plus: "Diamond Plus Membership Agreement",
  silver_plus: "Silver Plus Membership Agreement",
  elite_plus: "Elite Plus Membership Agreement",
};

/** Rough sharpness score: variance of a Laplacian-style edge response on a downscaled grayscale image. */
const measureSharpness = (canvas: HTMLCanvasElement): number => {
  const w = 320;
  const h = Math.max(1, Math.round((canvas.height / canvas.width) * w));
  const small = document.createElement("canvas");
  small.width = w;
  small.height = h;
  const ctx = small.getContext("2d");
  if (!ctx) return 0;
  ctx.drawImage(canvas, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  }
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap =
        4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w];
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  if (!n) return 0;
  const mean = sum / n;
  return sumSq / n - mean * mean;
};

const MembershipAgreementSection: React.FC<Props> = ({ tier, agreementTitle, onSubmitted }) => {
  const { toast } = useToast();
  const title = agreementTitle || TIER_LABEL[tier];

  const [showAgreement, setShowAgreement] = useState(false);
  const [showIdWarning, setShowIdWarning] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [sharpness, setSharpness] = useState<number | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  const idInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const SHARPNESS_MIN = 45;

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Load any previously submitted agreement for this user + tier.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from("membership_agreements")
        .select("agreed_at")
        .eq("user_id", user.id)
        .eq("tier", tier)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled && data?.agreed_at) {
        setSubmittedAt(data.agreed_at);
        onSubmitted?.();
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [tier]);

  const startCamera = async () => {
    setCameraError(null);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch (e) {
      setCameraError(
        "We could not access your camera. Please allow camera permission and try again."
      );
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setShowCamera(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const score = measureSharpness(canvas);
    setSharpness(score);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setSelfieBlob(blob);
        setSelfiePreview(URL.createObjectURL(blob));
        if (score < SHARPNESS_MIN) {
          toast({
            title: "Photo looks blurry",
            description:
              "Hold steady, add light, and make sure your face and ID are both readable. Please retake.",
            variant: "destructive",
          });
        } else {
          stopCamera();
          toast({ title: "Photo captured", description: "Clarity check passed." });
        }
      },
      "image/jpeg",
      0.92
    );
  };

  const handleSubmit = async () => {
    if (!idFile) {
      toast({
        title: "ID required",
        description: "Please upload a valid government ID.",
        variant: "destructive",
      });
      return;
    }
    if (!selfieBlob) {
      toast({
        title: "Photo verification required",
        description: "Take a selfie holding your ID next to your face.",
        variant: "destructive",
      });
      return;
    }
    if (sharpness !== null && sharpness < SHARPNESS_MIN) {
      toast({
        title: "Photo not clear enough",
        description: "Please retake your verification photo before agreeing.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in again to continue.");

      const { data: profile } = await supabase
        .from("users")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();

      const stamp = Date.now();
      const safeName = idFile.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
      const idPath = `${user.id}/${tier}/${stamp}_id_${safeName}`;
      const selfiePath = `${user.id}/${tier}/${stamp}_selfie.jpg`;

      const { error: idErr } = await supabase.storage
        .from("membership-ids")
        .upload(idPath, idFile, { contentType: idFile.type, upsert: false });
      if (idErr) throw idErr;

      const { error: selfieErr } = await supabase.storage
        .from("membership-ids")
        .upload(selfiePath, selfieBlob, { contentType: "image/jpeg", upsert: false });
      if (selfieErr) throw selfieErr;

      const agreedAt = new Date().toISOString();
      const { error: dbErr } = await supabase.from("membership_agreements").insert({
        user_id: user.id,
        username: profile?.username ?? null,
        tier,
        agreed_at: agreedAt,
        id_document_path: idPath,
        selfie_path: selfiePath,
        verification_status: "pending",
      });
      if (dbErr) throw dbErr;

      setSubmittedAt(agreedAt);
      toast({
        title: "Agreement submitted",
        description: "Your ID and agreement were sent to the admin team for verification.",
      });
    } catch (e: any) {
      toast({
        title: "Submission failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="bg-white/10 backdrop-blur border-white/20 mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <FileText className="w-5 h-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-gray-300">
          Review the full membership agreement, verify your identity, then confirm your agreement
          below.
        </p>

        <Dialog open={showAgreement} onOpenChange={setShowAgreement}>
          <DialogTrigger asChild>
            <Button variant="default" className="w-full">
              View Agreement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl bg-white text-black">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>
            <MembershipAgreementBody />
          </DialogContent>
        </Dialog>

        {/* Identity verification */}
        <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/5 p-4 space-y-4">
          <div className="flex items-center gap-2 text-yellow-300 font-semibold">
            <ShieldCheck className="w-5 h-5" />
            Identity Verification
          </div>

          <div className="flex items-start gap-2 text-sm text-yellow-200/90">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <p>
              Your ID must be valid. If your ID is not valid, all fees will be retained until your
              verification is valid.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-200">Government ID</Label>
            <input
              ref={idInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => setIdFile(e.target.files?.[0] ?? null)}
            />
            <Dialog open={showIdWarning} onOpenChange={setShowIdWarning}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {idFile ? "Replace ID" : "Upload ID"}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-gray-900 border-yellow-500 text-white">
                <DialogHeader>
                  <DialogTitle className="text-yellow-400">Before You Upload Your ID</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <p>
                    Your ID must be valid, unexpired, and fully readable (all four corners visible,
                    no glare).
                  </p>
                  <p className="font-semibold text-yellow-300">
                    If your ID is not valid, fees will be retained until verification is valid.
                  </p>
                  <Button
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                    onClick={() => {
                      setShowIdWarning(false);
                      idInputRef.current?.click();
                    }}
                  >
                    I Understand — Choose File
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            {idFile && (
              <p className="text-green-400 text-sm flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> {idFile.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-gray-200">Photo Verification (selfie holding your ID)</Label>
            {selfiePreview && (
              <img
                src={selfiePreview}
                alt="Verification selfie holding ID"
                className="w-40 rounded-lg border border-white/20"
              />
            )}
            {sharpness !== null && (
              <p
                className={`text-sm ${
                  sharpness >= SHARPNESS_MIN ? "text-green-400" : "text-red-400"
                }`}
              >
                {sharpness >= SHARPNESS_MIN
                  ? "Clarity check passed."
                  : "Photo is too blurry — please retake."}
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20"
              onClick={startCamera}
            >
              <Camera className="w-4 h-4 mr-2" />
              {selfieBlob ? "Retake Photo" : "Take Verification Photo"}
            </Button>
          </div>

          <Dialog
            open={showCamera}
            onOpenChange={(open) => (open ? setShowCamera(true) : stopCamera())}
          >
            <DialogContent className="max-w-lg bg-gray-900 border-white/20 text-white">
              <DialogHeader>
                <DialogTitle>Hold your ID next to your face</DialogTitle>
              </DialogHeader>
              {cameraError ? (
                <p className="text-red-400 text-sm">{cameraError}</p>
              ) : (
                <div className="space-y-3">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className="w-full rounded-lg bg-black"
                  />
                  <p className="text-gray-300 text-xs">
                    Make sure your face and the text on your ID are both clearly readable.
                  </p>
                  <Button
                    onClick={capturePhoto}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                  >
                    Capture Photo
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Agreement button */}
        {submittedAt ? (
          <div className="rounded-xl border border-green-500/50 bg-green-500/10 p-4 text-green-300 text-sm flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Agreement accepted on {new Date(submittedAt).toLocaleString()}. Verification is pending
            admin review.
          </div>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-black font-bold text-base py-6 rounded-xl shadow-lg"
          >
            <FileText className="w-5 h-5 mr-2" />
            {submitting ? "Submitting..." : "I Agree — Sign & Submit Agreement"}
          </Button>
        )}
        <p className="text-gray-400 text-xs text-center">
          Pressing the agreement button records your electronic signature with the date and time and
          sends your verification documents to the Dimes Only World admin team.
        </p>
      </CardContent>
    </Card>
  );
};

export default MembershipAgreementSection;
