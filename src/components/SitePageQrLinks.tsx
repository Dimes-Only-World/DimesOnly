import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const PAGES = [
  { path: "flix", label: "FlameFlix" },
  { path: "rentals", label: "Rentals" },
  { path: "clothes", label: "Clothes" },
];

// Free for every member: QR codes + links for main pages, carrying their referral.
export default function SitePageQrLinks({ username }: { username?: string | null }) {
  const { toast } = useToast();
  const ref = username ? `?ref=${encodeURIComponent(username)}` : "";

  return (
    <Card className="border border-border">
      <CardContent className="p-6 space-y-4">
        <div className="text-center">
          <h3 className="font-semibold text-primary">Share Pages</h3>
          <p className="text-sm text-muted-foreground">QR codes and links for FlameFlix, Rentals and Clothes.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {PAGES.map((p) => {
            const display = `www.DimesOnly.World/${p.path}${ref}`;
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
              <div key={p.path} className="flex flex-col items-center gap-2 rounded-lg border border-border p-3">
                <p className="font-semibold text-foreground">{p.label}</p>
                <div className="p-2 bg-background rounded border border-border">
                  <QRCodeSVG value={full} size={110} level="M" />
                </div>
                <div className="hidden"><QRCodeCanvas id={canvasId} value={full} size={1024} level="M" marginSize={4} /></div>
                <p className="text-xs font-mono break-all text-muted-foreground text-center">{display}</p>
                <div className="flex w-full gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1" onClick={copy}>
                    <Copy className="w-4 h-4 mr-1" /> Copy
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="flex-1" onClick={download}>
                    <Download className="w-4 h-4 mr-1" /> QR
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
