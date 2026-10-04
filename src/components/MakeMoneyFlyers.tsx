import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileImage, Share2, Facebook, Instagram, Copy, MessageSquare, Send, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import FlyerShareHistory, { logFlyerShare } from "@/components/FlyerShareHistory";
import firstFlyer from "@/assets/flyers/dimes-only-world-flyer.png.asset.json";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

const FALLBACK: Flyer[] = [{ id: "default", title: "Dimes Only World — Now Recruiting", url: firstFlyer.url }];

interface Flyer { id: string; title: string; url: string }

const downloadFile = async (url: string, name: string) => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const ext = (blob.type.split("/")[1] || "png").replace("jpeg", "jpg");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${name || "dimes-only-flier"}.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  } catch {
    window.open(url, "_blank");
  }
};

const MakeMoneyFlyers: React.FC<{ username?: string }> = ({ username }) => {
  const [flyers, setFlyers] = useState<Flyer[]>(FALLBACK);
  const [enlarged, setEnlarged] = useState<Flyer | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    supabase.functions
      .invoke("make-money", { body: { action: "listFlyers" } })
      .then(({ data, error }) => {
        if (error) console.error("Fliers failed to load", error);
        setFlyers(data?.flyers?.length ? data.flyers : FALLBACK);
      })
      .catch(() => setFlyers(FALLBACK));
  }, []);

  const link = `www.DimesOnly.World?ref=${encodeURIComponent(username || "")}`;
  const absoluteLink = `https://www.DimesOnly.World?ref=${encodeURIComponent(username || "")}`;
  const shareText = (f: Flyer) =>
    `${f.title || "Dimes Only World"} — Join me on Dimes Only World ${link}`;
  const enc = encodeURIComponent;
  const openUrl = (u: string) => window.open(u, "_blank", "noopener");
  const copy = async () => {
    await navigator.clipboard.writeText(link);
    toast({ title: "Link copied", description: link });
  };

  /** Native share tries to attach the flier image itself; falls back to text + link. */
  const nativeShare = async (f: Flyer) => {
    try {
      const res = await fetch(f.url);
      const blob = await res.blob();
      const file = new File([blob], `${(f.title || "flier").replace(/[^A-Za-z0-9]+/g, "-").toLowerCase()}.png`, { type: blob.type || "image/png" });
      if ((navigator as any).canShare?.({ files: [file] })) {
        await (navigator as any).share({ files: [file], title: f.title || "Dimes Only World", text: shareText(f) });
        return;
      }
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
    }
    if ((navigator as any).share) {
      await (navigator as any).share({ title: f.title || "Dimes Only World", text: shareText(f) });
    } else {
      await copy();
    }
  };

  const shareButtons = (f: Flyer, compact: boolean) => {
    const btns = [
      { label: "Share", Icon: Share2, onClick: () => nativeShare(f).catch(() => {}) },
      { label: "Contacts", Icon: MessageSquare, onClick: () => openUrl(`sms:?&body=${enc(shareText(f))}`) },
      { label: "Facebook", Icon: Facebook, onClick: () => openUrl(`https://www.facebook.com/sharer/sharer.php?u=${enc(absoluteLink)}`) },
      { label: "Instagram", Icon: Instagram, onClick: async () => { await copy(); openUrl("https://www.instagram.com/"); } },
      { label: "WhatsApp", Icon: MessageSquare, onClick: () => openUrl(`https://wa.me/?text=${enc(shareText(f))}`) },
      { label: "Telegram", Icon: Send, onClick: () => openUrl(`https://t.me/share/url?url=${enc(absoluteLink)}&text=${enc(f.title || "Join me on Dimes Only World")}`) },
      { label: "X", Icon: null, onClick: () => openUrl(`https://twitter.com/intent/tweet?text=${enc(shareText(f))}`) },
      { label: "Copy link", Icon: Copy, onClick: () => copy().catch(() => {}) },
    ];
    return (
      <div className={`grid gap-1.5 ${compact ? "grid-cols-4" : "grid-cols-4"}`}>
        {btns.map(({ label, Icon, onClick }) => (
          <Button
            key={label}
            type="button"
            variant="outline"
            onClick={() => { logFlyerShare(f.id, f.title || "Flier", label === "Copy link" ? "copy" : label.toLowerCase()); onClick(); }}
            className="h-12 min-w-0 flex-col gap-0.5 px-1 text-[11px] font-semibold leading-none"
            title={label}
          >
            {Icon ? <Icon className="h-4 w-4 shrink-0" /> : <span className="text-sm font-bold leading-none">𝕏</span>}
            <span className="max-w-full truncate">{label}</span>
          </Button>
        ))}
      </div>
    );
  };

  return (
    <>
      <Card className="border border-border" id="fliers">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileImage className="w-5 h-5" /> Downloadable Fliers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Carousel opts={{ loop: true }} className="mx-auto w-full max-w-2xl">
            <CarouselContent>
              {flyers.map((f) => (
                <CarouselItem key={f.id}>
                  <div className="mx-auto flex w-full max-w-xl flex-col gap-2">
              <button
                type="button"
                onClick={() => setEnlarged(f)}
                className="block w-full cursor-zoom-in overflow-hidden rounded-lg shadow-lg ring-1 ring-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Enlarge ${f.title || "flier"}`}
              >
                <img
                  src={f.url}
                  alt={f.title || "Flier"}
                  className="block h-auto max-h-[70vh] w-full object-contain transition-transform duration-200 hover:scale-[1.02]"
                  loading="eager"
                />
              </button>
              {f.title && <p className="text-sm font-medium text-foreground">{f.title}</p>}
              <Button onClick={() => downloadFile(f.url, f.title.replace(/[^A-Za-z0-9]+/g, "-").toLowerCase())} className="w-full">
                <Download className="w-4 h-4 mr-2" /> Download
              </Button>
              <p className="text-xs font-semibold text-muted-foreground">Share this flier</p>
              {shareButtons(f, true)}
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {flyers.length > 1 && (
              <>
                <CarouselPrevious className="left-2 top-[32%] bg-background/90" />
                <CarouselNext className="right-2 top-[32%] bg-background/90" />
              </>
            )}
          </Carousel>
        </CardContent>
      </Card>

      <div className="mt-4"><FlyerShareHistory flyers={flyers.map((f) => ({ id: f.id, title: f.title }))} /></div>

      {enlarged && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 cursor-zoom-out overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label={enlarged.title || "Enlarged flier"}
          onClick={() => setEnlarged(null)}
        >
          <img
            src={enlarged.url}
            alt={enlarged.title || "Flier"}
            className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          {enlarged.title && (
            <p className="mt-3 text-sm font-medium text-white text-center">{enlarged.title}</p>
          )}
          <div className="mt-4 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <Button variant="secondary" onClick={() => setEnlarged(null)}>Close</Button>
            <Button onClick={() => downloadFile(enlarged.url, enlarged.title.replace(/[^A-Za-z0-9]+/g, "-").toLowerCase())}>
              <Download className="w-4 h-4 mr-2" /> Download
            </Button>
          </div>
          <div className="mt-4 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            {shareButtons(enlarged, false)}
          </div>
        </div>
      )}
    </>
  );
};

export default MakeMoneyFlyers;
