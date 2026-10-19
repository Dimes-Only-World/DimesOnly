import React, { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getAdminUserId } from "@/lib/adminAuth";
import { ArrowDown, ArrowUp, Loader2, Trash2, Upload } from "lucide-react";
import ShortFormBackgroundCarousel, { BackgroundMedia } from "@/components/ShortFormBackgroundCarousel";

type Device = "desktop" | "tablet" | "mobile";
type BgPage = "short_form" | "login";

interface Row extends BackgroundMedia {
  device: Device;
  sort_order: number;
}

const BUCKET = "promo-videos";
const FOLDER = "short-form-bg";

const DeviceSection: React.FC<{
  device: Device;
  page: BgPage;
  title: string;
  subtitle: string;
  rows: Row[];
  onChanged: () => void;
}> = ({ device, page, title, subtitle, rows, onChanged }) => {
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
        const path = `${page === "login" ? "login-bg" : FOLDER}/${device}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { cacheControl: "31536000", upsert: false });
        if (uploadError) throw uploadError;

        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
        await callAdmin("addShortFormBackground", {
          device,
          page,
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

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const moveTo = async (from: number, to: number) => {
    if (to < 0 || to >= rows.length || from === to) return;
    setBusy(true);
    try {
      const reordered = [...rows];
      const [item] = reordered.splice(from, 1);
      reordered.splice(to, 0, item!);
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

  const move = (index: number, direction: -1 | 1) => moveTo(index, index + direction);

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
          <Button className="w-full sm:w-auto" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            {uploading ? "Uploading..." : "Upload images or videos"}
          </Button>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No media yet for this device size.</p>
        ) : (
          <>
          <p className="text-xs text-muted-foreground mb-2">Drag any tile to a new spot, or type its position number.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {rows.map((row, i) => (
              <div
                key={row.id}
                draggable={!busy}
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => { e.preventDefault(); setOverIndex(i); }}
                onDragLeave={() => setOverIndex((o) => (o === i ? null : o))}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIndex !== null) void moveTo(dragIndex, i);
                  setDragIndex(null); setOverIndex(null);
                }}
                onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
                className={`rounded-lg overflow-hidden border bg-muted/40 cursor-grab active:cursor-grabbing transition ${
                  overIndex === i && dragIndex !== i ? "border-primary ring-2 ring-primary" : "border-border"
                } ${dragIndex === i ? "opacity-50" : ""}`}
              >
                <div className="aspect-video bg-black pointer-events-none">
                  {row.media_type === "video" ? (
                    <video className="w-full h-full object-cover" muted playsInline preload="metadata">
                      <source src={row.url} />
                    </video>
                  ) : (
                    <img src={row.url} alt="" className="w-full h-full object-cover" loading="lazy" draggable={false} />
                  )}
                </div>
                <div className="flex items-center justify-between gap-1 p-2">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    #
                    <input
                      key={`${row.id}-${i}`}
                      type="number"
                      min={1}
                      max={rows.length}
                      defaultValue={i + 1}
                      disabled={busy}
                      aria-label="Position"
                      className="w-12 rounded border border-border bg-background px-1 py-0.5 text-xs text-foreground"
                      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                      onBlur={(e) => {
                        const n = parseInt(e.target.value, 10);
                        if (!Number.isFinite(n)) { e.target.value = String(i + 1); return; }
                        void moveTo(i, Math.min(Math.max(n, 1), rows.length) - 1);
                      }}
                    />
                    · {row.media_type}
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
                device === "mobile" ? "w-full max-w-[280px] aspect-[9/16]" : device === "tablet" ? "w-full max-w-[420px] aspect-[3/4]" : "w-full aspect-video"
              }`}
            >
              <ShortFormBackgroundCarousel device={device} media={rows} position="absolute" />
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="bg-gray-900/50 border border-orange-500/60 rounded-xl px-5 py-4 text-center">
                  <p className="text-orange-400 font-bold">{page === "login" ? "Member Login" : "Let\u0027s get you started"}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const AdminShortFormBackgroundTab: React.FC<{ page?: BgPage }> = ({ page = "short_form" }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("short_form_backgrounds")
      .select("id, device, media_type, url, sort_order")
      .eq("page", page)
      .order("sort_order", { ascending: true });
    if (!error && data) setRows(data as Row[]);
    setLoading(false);
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <p className="text-muted-foreground">Loading background media...</p>;
  }

  const label = page === "login" ? "the login page" : "the short form";
  return (
    <div className="space-y-6">
      <DeviceSection
        device="desktop"
        page={page}
        title="Desktop Background"
        subtitle={`Shown behind ${label} on screens 1024px and wider.`}
        rows={rows.filter((r) => r.device === "desktop")}
        onChanged={load}
      />
      <DeviceSection
        device="tablet"
        page={page}
        title="Tablet Background"
        subtitle={`Shown behind ${label} on screens 768px–1023px. If empty, tablets use the desktop set.`}
        rows={rows.filter((r) => r.device === "tablet")}
        onChanged={load}
      />
      <DeviceSection
        device="mobile"
        page={page}
        title="Mobile Background"
        subtitle={`Shown behind ${label} on screens narrower than 768px.`}
        rows={rows.filter((r) => r.device === "mobile")}
        onChanged={load}
      />
    </div>
  );
};

export default AdminShortFormBackgroundTab;
