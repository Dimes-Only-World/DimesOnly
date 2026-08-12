import React, { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getAdminUserId } from "@/lib/adminAuth";
import { ArrowDown, ArrowUp, Loader2, Trash2, Upload } from "lucide-react";
import ShortFormBackgroundCarousel, { BackgroundMedia } from "@/components/ShortFormBackgroundCarousel";

type Device = "desktop" | "mobile";

interface Row extends BackgroundMedia {
  device: Device;
  sort_order: number;
}

const BUCKET = "promo-videos";
const FOLDER = "short-form-bg";

const DeviceSection: React.FC<{
  device: Device;
  title: string;
  subtitle: string;
  rows: Row[];
  onChanged: () => void;
}> = ({ device, title, subtitle, rows, onChanged }) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const callAdmin = async (action: string, payload: Record<string, unknown>) => {
    const adminUserId = getAdminUserId();
    if (!adminUserId) throw new Error("Admin session not found");
    const { data, error } = await supabase.functions.invoke("admin-data", {
      body: { action, adminUserId, ...payload },
    });
    if (error) throw error;
    return data;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const isVideo = file.type.startsWith("video/");
        const isImage = file.type.startsWith("image/");
        if (!isVideo && !isImage) {
          toast({ title: "Skipped", description: `${file.name} is not an image or video`, variant: "destructive" });
          continue;
        }

        const ext = file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
        const path = `${FOLDER}/${device}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { cacheControl: "31536000", upsert: false });
        if (uploadError) throw uploadError;

        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
        await callAdmin("addShortFormBackground", {
          device,
          mediaType: isVideo ? "video" : "image",
          url: pub.publicUrl,
        });
      }
      toast({ title: "Uploaded", description: "Background media added." });
      onChanged();
    } catch (err) {
      console.error("Background upload failed", err);
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Unable to upload media",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    setBusy(true);
    try {
      const reordered = [...rows];
      [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
      await callAdmin("reorderShortFormBackgrounds", {
        items: reordered.map((r, i) => ({ id: r.id, sort_order: i })),
      });
      onChanged();
    } catch (err) {
      toast({ title: "Error", description: "Could not reorder media", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      await callAdmin("deleteShortFormBackground", { id });
      toast({ title: "Removed", description: "Media deleted from the carousel." });
      onChanged();
    } catch (err) {
      toast({ title: "Error", description: "Could not delete media", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            {uploading ? "Uploading..." : "Upload images or videos"}
          </Button>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No media yet for this device size.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {rows.map((row, i) => (
              <div key={row.id} className="rounded-lg overflow-hidden border border-border bg-muted/40">
                <div className="aspect-video bg-black">
                  {row.media_type === "video" ? (
                    <video className="w-full h-full object-cover" muted playsInline preload="metadata">
                      <source src={row.url} />
                    </video>
                  ) : (
                    <img src={row.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  )}
                </div>
                <div className="flex items-center justify-between gap-1 p-2">
                  <span className="text-xs text-muted-foreground">
                    #{i + 1} · {row.media_type}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={busy || i === 0} onClick={() => move(i, -1)}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      disabled={busy || i === rows.length - 1}
                      onClick={() => move(i, 1)}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" disabled={busy} onClick={() => remove(row.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {rows.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Live preview</p>
            <div
              className={`relative overflow-hidden rounded-xl border border-border ${
                device === "mobile" ? "w-[280px] aspect-[9/16]" : "w-full aspect-video"
              }`}
            >
              <ShortFormBackgroundCarousel device={device} media={rows} />
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="bg-gray-900/75 backdrop-blur-md border border-orange-500/60 rounded-xl px-5 py-4 text-center">
                  <p className="text-orange-400 font-bold">Let&apos;s get you started</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const AdminShortFormBackgroundTab: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("short_form_backgrounds")
      .select("id, device, media_type, url, sort_order")
      .order("sort_order", { ascending: true });
    if (!error && data) setRows(data as Row[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <p className="text-muted-foreground">Loading background media...</p>;
  }

  return (
    <div className="space-y-6">
      <DeviceSection
        device="desktop"
        title="Desktop / Tablet Background"
        subtitle="Shown behind the short form on screens 768px and wider. Tablets use these settings."
        rows={rows.filter((r) => r.device === "desktop")}
        onChanged={load}
      />
      <DeviceSection
        device="mobile"
        title="Mobile Background"
        subtitle="Shown behind the short form on screens narrower than 768px."
        rows={rows.filter((r) => r.device === "mobile")}
        onChanged={load}
      />
    </div>
  );
};

export default AdminShortFormBackgroundTab;
