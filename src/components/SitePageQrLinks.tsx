import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import flixBg from "@/assets/share/flix.jpg";
import rentalsBg from "@/assets/share/rentals.jpg";
import clothesBg from "@/assets/share/clothes.jpg";
import tipBg from "@/assets/share/tip.jpg";
import rateBg from "@/assets/share/rate.jpg";

const PAGES = [
  { path: "flix", label: "FlameFlix", bg: flixBg },
  { path: "rentals", label: "Rentals", bg: rentalsBg },
  { path: "clothes", label: "Clothes", bg: clothesBg },
];

// Free for every member: QR codes + links for main pages, carrying their referral.
// Rate is Dimes-only: it appears only when `dime` is true (female members).
export default function SitePageQrLinks({ username, dime }: { username?: string | null; dime?: boolean }) {
  const { toast } = useToast();
  const ref = username ? `?ref=${encodeURIComponent(username)}` : "";
  const u = username ? encodeURIComponent(username) : "";
  // Dimes get personal Tip and Rate links that open their own page.
  const pages = dime
    ? [
        ...PAGES.map((p) => ({ ...p, link: `${p.path}${ref}` })),
        { path: "tip", label: "Tip Me", bg: tipBg, link: u ? `tips/${u}` : "tips" },
        { path: "rate", label: "Rate Me", bg: rateBg, link: u ? `rates/${u}` : "rate" },
      ]
    : PAGES.map((p) => ({ ...p, link: `${p.path}${ref}` }));

  return (
    <Card className="border border-border">
      <CardContent className="p-6 space-y-4">
        <div className="text-center">
          <h3 className="font-semibold text-primary">Share Pages</h3>
          <p className="text-sm text-muted-foreground">
            {dime
              ? "QR codes and links for FlameFlix, Rentals, Clothes, plus your own Tip and Rate pages."
              : "QR codes and links for FlameFlix, Rentals and Clothes."}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((p) => {
            const display = `www.DimesOnly.World/${p.link}`;
            const full = `https://${display}`;
            const canvasId = `page-qr-${p.path}`;
            const download = () => {
              const c = document.getElementById(canvasId) as HTMLCanvasElement | null;
              if (!c) return;
              const a = document.createElement("a");
              a.href = c.toDataURL("image/png");
              a.download = `DimesOnly-${p.label}-QR.png`;
              a.click();
            };
            const copy = async () => {
              try { await navigator.clipboard.writeText(display); toast({ title: `${p.label} link copied` }); }
              catch { toast({ title: "Could not copy", variant: "destructive" }); }
            };
            return (
              <div key={p.path} className="relative overflow-hidden rounded-xl border border-primary/40 shadow-lg">
                <img src={p.bg} alt="" loading="lazy" width={816} height={816} className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background/95" />
                <div className="relative flex flex-col items-center gap-2 p-4">
                <p className="font-bold uppercase tracking-widest text-foreground drop-shadow">{p.label}</p>
                <div className="p-2 bg-card rounded-lg border border-primary/50 shadow-md">
                  <QRCodeSVG value={full} size={120} level="M" />
                </div>
                <div className="hidden"><QRCodeCanvas id={canvasId} value={full} size={1024} level="M" marginSize={4} /></div>
                <p className="text-xs font-mono break-all text-foreground/90 text-center">{display}</p>
                <div className="flex w-full gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1" onClick={copy}>
                    <Copy className="w-4 h-4 mr-1" /> Copy
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="flex-1" onClick={download}>
                    <Download className="w-4 h-4 mr-1" /> QR
                  </Button>
                </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
