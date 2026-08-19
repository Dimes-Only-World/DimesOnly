import React, { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Camera, Upload, Share2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Props = {
  bookingId?: string | null;
  vehicleId?: string | null;
  userId: string;
  vehicleTitle?: string;
  onUploaded?: () => void;
  trigger?: React.ReactNode;
};

const WATERMARK_TEXT = "DIMES ONLY WORLD";
const HASHTAGS = "#DimesOnlyWorld #RentalGoals #LuxuryRides";

/** Overlays watermark onto an image file and returns a watermarked Blob. */
async function watermarkImage(file: File): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = URL.createObjectURL(file);
  });
  const canvas = document.createElement("canvas");
  const maxDim = 2048;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Watermark bar
  const padding = Math.max(12, canvas.width * 0.015);
  const fontSize = Math.max(20, Math.round(canvas.width * 0.028));
  ctx.font = `700 ${fontSize}px system-ui, -apple-system, Inter, sans-serif`;
  const textWidth = ctx.measureText(WATERMARK_TEXT).width;
  const barHeight = fontSize * 1.6;
  const barWidth = textWidth + padding * 2;
  const x = canvas.width - barWidth - padding;
  const y = canvas.height - barHeight - padding;

  // Gradient background
  const grad = ctx.createLinearGradient(x, y, x + barWidth, y);
  grad.addColorStop(0, "rgba(233, 22, 209, 0.85)");
  grad.addColorStop(1, "rgba(120, 8, 110, 0.85)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  const r = barHeight / 2;
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + barWidth - r, y);
  ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + r);
  ctx.lineTo(x + barWidth, y + barHeight - r);
  ctx.quadraticCurveTo(x + barWidth, y + barHeight, x + barWidth - r, y + barHeight);
  ctx.lineTo(x + r, y + barHeight);
  ctx.quadraticCurveTo(x, y + barHeight, x, y + barHeight - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.fillText(WATERMARK_TEXT, x + padding, y + barHeight / 2);

  return await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.92),
  );
}

const CaptureMomentUploader: React.FC<Props> = ({
  bookingId,
  vehicleId,
  userId,
  vehicleTitle,
  onUploaded,
  trigger,
}) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setCaption("");
    setUploadedUrl(null);
  };

  const onPick = async (f: File | null) => {
    if (!f) return;
    setFile(f);
    if (f.type.startsWith("image/")) {
      try {
        const wm = await watermarkImage(f);
        setPreview(URL.createObjectURL(wm));
      } catch {
        setPreview(URL.createObjectURL(f));
      }
    } else {
      setPreview(URL.createObjectURL(f));
    }
  };

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (!isImage && !isVideo) throw new Error("Only image or video files are allowed.");

      const blob = isImage ? await watermarkImage(file) : file;
      const ext = isImage ? "jpg" : (file.name.split(".").pop() || "mp4");
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("rental-captures")
        .upload(path, blob, { contentType: isImage ? "image/jpeg" : file.type });
      if (upErr) throw upErr;

      const { error: insErr, data } = await (supabase as any)
        .from("rental_captures")
        .insert({
          booking_id: bookingId || null,
          vehicle_id: vehicleId || null,
          user_id: userId,
          media_type: isImage ? "photo" : "video",
          storage_path: path,
          caption: caption || null,
          moderation_status: "pending",
        })
        .select()
        .single();
      if (insErr) throw insErr;

      const { data: signed } = await supabase.storage
        .from("rental-captures")
        .createSignedUrl(path, 60 * 60);
      setUploadedUrl(signed?.signedUrl || null);
      toast({
        title: "Capture uploaded!",
        description: "Pending review — it'll appear in the public gallery once approved.",
      });
      onUploaded?.();
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const shareCaption = `Just rented ${vehicleTitle || "a car"} from Dimes Only World! ${HASHTAGS}`;
  const shareUrl = "https://dimesonly.world/rentals";

  const nativeShare = async () => {
    const shareData: ShareData = { title: "Dimes Only World Rental", text: shareCaption, url: shareUrl };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(`${shareCaption} ${shareUrl}`);
        toast({ title: "Copied caption to clipboard" });
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <>
      <span onClick={() => setOpen(true)} className="inline-block">
        {trigger || (
          <Button size="sm" variant="secondary">
            <Camera className="w-4 h-4 mr-1" /> Capture the Moment
          </Button>
        )}
      </span>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" /> Capture the Moment
            </DialogTitle>
            <DialogDescription>
              Upload a photo or video with your rental. We'll add the Dimes Only World watermark
              automatically and enter it into featured/contest lineups after review.
            </DialogDescription>
          </DialogHeader>

          {!uploadedUrl ? (
            <>
              <div className="space-y-3">
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*,video/*"
                  capture="environment"
                  onChange={(e) => onPick(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <div className="flex gap-2 flex-wrap">
                  <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-1" /> Choose or Take Photo/Video
                  </Button>
                </div>

                {preview && (
                  <div className="rounded overflow-hidden bg-black/40 max-h-72 flex items-center justify-center">
                    {file?.type.startsWith("video/") ? (
                      import React, { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Camera, Upload, Share2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Props = {
  bookingId?: string | null;
  vehicleId?: string | null;
  userId: string;
  vehicleTitle?: string;
  onUploaded?: () => void;
  trigger?: React.ReactNode;
};

const WATERMARK_TEXT = "DIMES ONLY WORLD";
const HASHTAGS = "#DimesOnlyWorld #RentalGoals #LuxuryRides";

/** Overlays watermark onto an image file and returns a watermarked Blob. */
async function watermarkImage(file: File): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = URL.createObjectURL(file);
  });
  const canvas = document.createElement("canvas");
  const maxDim = 2048;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Watermark bar
  const padding = Math.max(12, canvas.width * 0.015);
  const fontSize = Math.max(20, Math.round(canvas.width * 0.028));
  ctx.font = `700 ${fontSize}px system-ui, -apple-system, Inter, sans-serif`;
  const textWidth = ctx.measureText(WATERMARK_TEXT).width;
  const barHeight = fontSize * 1.6;
  const barWidth = textWidth + padding * 2;
  const x = canvas.width - barWidth - padding;
  const y = canvas.height - barHeight - padding;

  // Gradient background
  const grad = ctx.createLinearGradient(x, y, x + barWidth, y);
  grad.addColorStop(0, "rgba(233, 22, 209, 0.85)");
  grad.addColorStop(1, "rgba(120, 8, 110, 0.85)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  const r = barHeight / 2;
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + barWidth - r, y);
  ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + r);
  ctx.lineTo(x + barWidth, y + barHeight - r);
  ctx.quadraticCurveTo(x + barWidth, y + barHeight, x + barWidth - r, y + barHeight);
  ctx.lineTo(x + r, y + barHeight);
  ctx.quadraticCurveTo(x, y + barHeight, x, y + barHeight - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.fillText(WATERMARK_TEXT, x + padding, y + barHeight / 2);

  return await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.92),
  );
}

const CaptureMomentUploader: React.FC<Props> = ({
  bookingId,
  vehicleId,
  userId,
  vehicleTitle,
  onUploaded,
  trigger,
}) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setCaption("");
    setUploadedUrl(null);
  };

  const onPick = async (f: File | null) => {
    if (!f) return;
    setFile(f);
    if (f.type.startsWith("image/")) {
      try {
        const wm = await watermarkImage(f);
        setPreview(URL.createObjectURL(wm));
      } catch {
        setPreview(URL.createObjectURL(f));
      }
    } else {
      setPreview(URL.createObjectURL(f));
    }
  };

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (!isImage && !isVideo) throw new Error("Only image or video files are allowed.");

      const blob = isImage ? await watermarkImage(file) : file;
      const ext = isImage ? "jpg" : (file.name.split(".").pop() || "mp4");
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("rental-captures")
        .upload(path, blob, { contentType: isImage ? "image/jpeg" : file.type });
      if (upErr) throw upErr;

      const { error: insErr, data } = await (supabase as any)
        .from("rental_captures")
        .insert({
          booking_id: bookingId || null,
          vehicle_id: vehicleId || null,
          user_id: userId,
          media_type: isImage ? "photo" : "video",
          storage_path: path,
          caption: caption || null,
          moderation_status: "pending",
        })
        .select()
        .single();
      if (insErr) throw insErr;

      const { data: signed } = await supabase.storage
        .from("rental-captures")
        .createSignedUrl(path, 60 * 60);
      setUploadedUrl(signed?.signedUrl || null);
      toast({
        title: "Capture uploaded!",
        description: "Pending review — it'll appear in the public gallery once approved.",
      });
      onUploaded?.();
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const shareCaption = `Just rented ${vehicleTitle || "a car"} from Dimes Only World! ${HASHTAGS}`;
  const shareUrl = "https://dimesonly.world/rentals";

  const nativeShare = async () => {
    const shareData: ShareData = { title: "Dimes Only World Rental", text: shareCaption, url: shareUrl };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(`${shareCaption} ${shareUrl}`);
        toast({ title: "Copied caption to clipboard" });
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <>
      <span onClick={() => setOpen(true)} className="inline-block">
        {trigger || (
          <Button size="sm" variant="secondary">
            <Camera className="w-4 h-4 mr-1" /> Capture the Moment
          </Button>
        )}
      </span>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" /> Capture the Moment
            </DialogTitle>
            <DialogDescription>
              Upload a photo or video with your rental. We'll add the Dimes Only World watermark
              automatically and enter it into featured/contest lineups after review.
            </DialogDescription>
          </DialogHeader>

          {!uploadedUrl ? (
            <>
              <div className="space-y-3">
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*,video/*"
                  capture="environment"
                  onChange={(e) => onPick(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <div className="flex gap-2 flex-wrap">
                  <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-1" /> Choose or Take Photo/Video
                  </Button>
                </div>

                {preview && (
                  <div className="rounded overflow-hidden bg-black/40 max-h-72 flex items-center justify-center">
                    {file?.type.startsWith("video/") ? (
                      <video src={preview} className="max-h-72" controls / controlsList="nodownload" disablePictureInPicture disableRemotePlayback>
                    ) : (
                      <img src={preview} alt="preview" className="max-h-72 object-contain" />
                    )}
                  </div>
                )}

                <div>
                  <Label>Caption (optional)</Label>
                  <Textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder={`Living the ${vehicleTitle || "rental"} life with @dimesonlyworld ${HASHTAGS}`}
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
                  Cancel
                </Button>
                <Button onClick={upload} disabled={!file || busy}>
                  {busy ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Uploading…</> : "Upload Capture"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div className="rounded overflow-hidden bg-black/40 max-h-72 flex items-center justify-center">
                  {file?.type.startsWith("video/") ? (
                    <video src={uploadedUrl} className="max-h-72" controls />
                  ) : (
                    <img src={uploadedUrl} alt="uploaded" className="max-h-72 object-contain" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Uploaded and watermarked. Share the moment:
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button onClick={nativeShare}>
                    <Share2 className="w-4 h-4 mr-1" /> Share
                  </Button>
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareCaption)}&url=${encodeURIComponent(shareUrl)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button variant="outline">Post to X</Button>
                  </a>
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareCaption)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button variant="outline">Post to Facebook</Button>
                  </a>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setOpen(false)}>Done</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CaptureMomentUploader;

                    ) : (
                      <img src={preview} alt="preview" className="max-h-72 object-contain" />
                    )}
                  </div>
                )}

                <div>
                  <Label>Caption (optional)</Label>
                  <Textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder={`Living the ${vehicleTitle || "rental"} life with @dimesonlyworld ${HASHTAGS}`}
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
                  Cancel
                </Button>
                <Button onClick={upload} disabled={!file || busy}>
                  {busy ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Uploading…</> : "Upload Capture"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div className="rounded overflow-hidden bg-black/40 max-h-72 flex items-center justify-center">
                  {file?.type.startsWith("video/") ? (
                    import React, { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Camera, Upload, Share2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Props = {
  bookingId?: string | null;
  vehicleId?: string | null;
  userId: string;
  vehicleTitle?: string;
  onUploaded?: () => void;
  trigger?: React.ReactNode;
};

const WATERMARK_TEXT = "DIMES ONLY WORLD";
const HASHTAGS = "#DimesOnlyWorld #RentalGoals #LuxuryRides";

/** Overlays watermark onto an image file and returns a watermarked Blob. */
async function watermarkImage(file: File): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = URL.createObjectURL(file);
  });
  const canvas = document.createElement("canvas");
  const maxDim = 2048;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Watermark bar
  const padding = Math.max(12, canvas.width * 0.015);
  const fontSize = Math.max(20, Math.round(canvas.width * 0.028));
  ctx.font = `700 ${fontSize}px system-ui, -apple-system, Inter, sans-serif`;
  const textWidth = ctx.measureText(WATERMARK_TEXT).width;
  const barHeight = fontSize * 1.6;
  const barWidth = textWidth + padding * 2;
  const x = canvas.width - barWidth - padding;
  const y = canvas.height - barHeight - padding;

  // Gradient background
  const grad = ctx.createLinearGradient(x, y, x + barWidth, y);
  grad.addColorStop(0, "rgba(233, 22, 209, 0.85)");
  grad.addColorStop(1, "rgba(120, 8, 110, 0.85)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  const r = barHeight / 2;
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + barWidth - r, y);
  ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + r);
  ctx.lineTo(x + barWidth, y + barHeight - r);
  ctx.quadraticCurveTo(x + barWidth, y + barHeight, x + barWidth - r, y + barHeight);
  ctx.lineTo(x + r, y + barHeight);
  ctx.quadraticCurveTo(x, y + barHeight, x, y + barHeight - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.fillText(WATERMARK_TEXT, x + padding, y + barHeight / 2);

  return await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.92),
  );
}

const CaptureMomentUploader: React.FC<Props> = ({
  bookingId,
  vehicleId,
  userId,
  vehicleTitle,
  onUploaded,
  trigger,
}) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setCaption("");
    setUploadedUrl(null);
  };

  const onPick = async (f: File | null) => {
    if (!f) return;
    setFile(f);
    if (f.type.startsWith("image/")) {
      try {
        const wm = await watermarkImage(f);
        setPreview(URL.createObjectURL(wm));
      } catch {
        setPreview(URL.createObjectURL(f));
      }
    } else {
      setPreview(URL.createObjectURL(f));
    }
  };

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (!isImage && !isVideo) throw new Error("Only image or video files are allowed.");

      const blob = isImage ? await watermarkImage(file) : file;
      const ext = isImage ? "jpg" : (file.name.split(".").pop() || "mp4");
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("rental-captures")
        .upload(path, blob, { contentType: isImage ? "image/jpeg" : file.type });
      if (upErr) throw upErr;

      const { error: insErr, data } = await (supabase as any)
        .from("rental_captures")
        .insert({
          booking_id: bookingId || null,
          vehicle_id: vehicleId || null,
          user_id: userId,
          media_type: isImage ? "photo" : "video",
          storage_path: path,
          caption: caption || null,
          moderation_status: "pending",
        })
        .select()
        .single();
      if (insErr) throw insErr;

      const { data: signed } = await supabase.storage
        .from("rental-captures")
        .createSignedUrl(path, 60 * 60);
      setUploadedUrl(signed?.signedUrl || null);
      toast({
        title: "Capture uploaded!",
        description: "Pending review — it'll appear in the public gallery once approved.",
      });
      onUploaded?.();
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const shareCaption = `Just rented ${vehicleTitle || "a car"} from Dimes Only World! ${HASHTAGS}`;
  const shareUrl = "https://dimesonly.world/rentals";

  const nativeShare = async () => {
    const shareData: ShareData = { title: "Dimes Only World Rental", text: shareCaption, url: shareUrl };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(`${shareCaption} ${shareUrl}`);
        toast({ title: "Copied caption to clipboard" });
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <>
      <span onClick={() => setOpen(true)} className="inline-block">
        {trigger || (
          <Button size="sm" variant="secondary">
            <Camera className="w-4 h-4 mr-1" /> Capture the Moment
          </Button>
        )}
      </span>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" /> Capture the Moment
            </DialogTitle>
            <DialogDescription>
              Upload a photo or video with your rental. We'll add the Dimes Only World watermark
              automatically and enter it into featured/contest lineups after review.
            </DialogDescription>
          </DialogHeader>

          {!uploadedUrl ? (
            <>
              <div className="space-y-3">
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*,video/*"
                  capture="environment"
                  onChange={(e) => onPick(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <div className="flex gap-2 flex-wrap">
                  <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-1" /> Choose or Take Photo/Video
                  </Button>
                </div>

                {preview && (
                  <div className="rounded overflow-hidden bg-black/40 max-h-72 flex items-center justify-center">
                    {file?.type.startsWith("video/") ? (
                      <video src={preview} className="max-h-72" controls />
                    ) : (
                      <img src={preview} alt="preview" className="max-h-72 object-contain" />
                    )}
                  </div>
                )}

                <div>
                  <Label>Caption (optional)</Label>
                  <Textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder={`Living the ${vehicleTitle || "rental"} life with @dimesonlyworld ${HASHTAGS}`}
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
                  Cancel
                </Button>
                <Button onClick={upload} disabled={!file || busy}>
                  {busy ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Uploading…</> : "Upload Capture"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div className="rounded overflow-hidden bg-black/40 max-h-72 flex items-center justify-center">
                  {file?.type.startsWith("video/") ? (
                    <video src={uploadedUrl} className="max-h-72" controls / controlsList="nodownload" disablePictureInPicture disableRemotePlayback>
                  ) : (
                    <img src={uploadedUrl} alt="uploaded" className="max-h-72 object-contain" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Uploaded and watermarked. Share the moment:
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button onClick={nativeShare}>
                    <Share2 className="w-4 h-4 mr-1" /> Share
                  </Button>
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareCaption)}&url=${encodeURIComponent(shareUrl)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button variant="outline">Post to X</Button>
                  </a>
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareCaption)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button variant="outline">Post to Facebook</Button>
                  </a>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setOpen(false)}>Done</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CaptureMomentUploader;

                  ) : (
                    <img src={uploadedUrl} alt="uploaded" className="max-h-72 object-contain" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Uploaded and watermarked. Share the moment:
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button onClick={nativeShare}>
                    <Share2 className="w-4 h-4 mr-1" /> Share
                  </Button>
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareCaption)}&url=${encodeURIComponent(shareUrl)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button variant="outline">Post to X</Button>
                  </a>
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareCaption)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button variant="outline">Post to Facebook</Button>
                  </a>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setOpen(false)}>Done</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CaptureMomentUploader;
