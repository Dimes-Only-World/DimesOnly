import React, { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

const toBase64 = (file: File) => new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result).split(",")[1] || ""); r.onerror = reject; r.readAsDataURL(file); });

/** Admin manager for the rotating vehicle photos behind the buyer application. */
const PurchaseBackgroundsPanel: React.FC<{ callAdmin: (action: string, extra?: Record<string, any>) => Promise<any> }> = ({ callAdmin }) => {
  const [items, setItems] = useState<{ path: string; url: string | null }[]>([]);
  const [busy, setBusy] = useState(false);
  const load = async () => { try { const r = await callAdmin("listPurchaseBackgrounds"); setItems(r?.data || []); } catch (e: any) { toast({ title: "Could not load photos", description: e.message, variant: "destructive" }); } };
  useEffect(() => { load(); }, []);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return; setBusy(true);
    for (const f of Array.from(files)) {
      try { await callAdmin("addPurchaseBackground", { fileName: f.name, contentType: f.type, base64: await toBase64(f) }); }
      catch (e: any) { toast({ title: "Upload failed", description: e.message, variant: "destructive" }); }
    }
    setBusy(false); load();
  };
  const save = async (paths: string[]) => {
    try { await callAdmin("setPurchaseBackgrounds", { paths }); load(); }
    catch (e: any) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); }
  };
  const move = (i: number, d: number) => { const p = items.map((x) => x.path); const j = i + d; if (j < 0 || j >= p.length) return; [p[i], p[j]] = [p[j], p[i]]; save(p); };

  return <Card><CardContent className="space-y-4 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="font-semibold">Buyer application background photos</h3><p className="text-sm text-muted-foreground">These rotate behind the purchase application, in this order.</p></div>
      <label><Button asChild disabled={busy}><span><Upload className="mr-2 h-4 w-4" />{busy ? "Uploading…" : "Add photos"}</span></Button><input type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => upload(e.target.files)} /></label>
    </div>
    {items.length === 0 && <p className="text-sm text-muted-foreground">No photos yet — the application shows a plain background.</p>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((it, i) => <div key={it.path} className="overflow-hidden rounded border border-border">
        {it.url ? <img src={it.url} alt={`Background ${i + 1}`} className="aspect-video w-full object-cover" /> : <div className="aspect-video bg-muted" />}
        <div className="flex items-center justify-between p-2 text-sm"><span>#{i + 1}</span><div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={() => move(i, -1)} aria-label="Move earlier"><ArrowUp className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => move(i, 1)} aria-label="Move later"><ArrowDown className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => { if (confirm("Remove this photo?")) save(items.filter((x) => x.path !== it.path).map((x) => x.path)); }} aria-label="Remove"><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div></div>
      </div>)}
    </div>
  </CardContent></Card>;
};
export default PurchaseBackgroundsPanel;
