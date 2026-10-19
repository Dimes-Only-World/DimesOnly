import React, { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { DEFAULT_RENTAL_UPDATES, parseRentalUpdates, type RentalUpdate } from "@/lib/rentalUpdates";

const toBase64 = (file: File) => new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result).split(",")[1] || ""); r.onerror = reject; r.readAsDataURL(file); });
type Item = RentalUpdate & { url?: string | null };

/** Admin editor for the update notes + photos carousel on /rentals. Title and note are optional. */
const RentalUpdatesPanel: React.FC<{ callAdmin: (action: string, extra?: Record<string, any>) => Promise<any> }> = ({ callAdmin }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const load = async () => {
    try { const r = await callAdmin("listRentalUpdates"); setItems(r?.data === null ? DEFAULT_RENTAL_UPDATES.map((x) => ({ ...x, url: x.image_url })) : parseRentalUpdates({ items: r?.data }).map((x: any) => ({ ...x, url: x.url || x.image_url }))); }
    catch (e: any) { toast({ title: "Could not load updates", description: e.message, variant: "destructive" }); }
  };
  useEffect(() => { load(); }, []);

  const patch = (id: string, p: Partial<Item>) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const move = (i: number, d: number) => setItems((xs) => { const a = [...xs]; const j = i + d; if (j < 0 || j >= a.length) return xs; [a[i], a[j]] = [a[j]!, a[i]!]; return a; });
  const uploadFor = async (id: string, f?: File) => {
    if (!f) return; setBusy(true);
    try { const r = await callAdmin("uploadRentalUpdateImage", { fileName: f.name, contentType: f.type, base64: await toBase64(f) }); patch(id, { path: r.data.path, image_url: null, url: URL.createObjectURL(f) }); }
    catch (e: any) { toast({ title: "Upload failed", description: e.message, variant: "destructive" }); }
    setBusy(false);
  };
  const save = async () => {
    setBusy(true);
    try {
      await callAdmin("saveRentalUpdates", { items: items.map(({ id, title, body, path, image_url }) => ({ id, title: title || "", body: body || "", path: path || null, image_url: image_url || null })) });
      toast({ title: "Carousel saved" }); load();
    } catch (e: any) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); }
    setBusy(false);
  };

  return <Card><CardContent className="space-y-4 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="font-semibold">Rentals updates carousel</h3><p className="text-sm text-muted-foreground">Shows on /rentals between the credit app box and search. Title and note are optional — leave both empty for a photo-only slide.</p></div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => setItems((xs) => [...xs, { id: crypto.randomUUID(), title: "", body: "" }])}><Plus className="mr-2 h-4 w-4" />Add slide</Button>
        <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save carousel"}</Button>
      </div>
    </div>
    {items.length === 0 && <p className="text-sm text-muted-foreground">No slides — the carousel is hidden.</p>}
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((it, i) => <div key={it.id} className="space-y-2 rounded border border-border p-3">
        {it.url ? <img src={it.url} alt={`Slide ${i + 1}`} className="aspect-video w-full rounded object-cover" /> : <div className="flex aspect-video items-center justify-center rounded bg-muted text-sm text-muted-foreground">No photo</div>}
        <label className="block"><Button asChild size="sm" variant="secondary" disabled={busy}><span><Upload className="mr-2 h-4 w-4" />{it.url ? "Replace photo" : "Upload photo"}</span></Button><input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => uploadFor(it.id, e.target.files?.[0])} /></label>
        <Input placeholder="Title (optional)" value={it.title} onChange={(e) => patch(it.id, { title: e.target.value })} maxLength={120} />
        <Textarea placeholder="Note (optional)" value={it.body} onChange={(e) => patch(it.id, { body: e.target.value })} maxLength={400} rows={2} />
        <div className="flex items-center justify-between text-sm"><span>#{i + 1}</span><div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={() => move(i, -1)} aria-label="Move earlier"><ArrowUp className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => move(i, 1)} aria-label="Move later"><ArrowDown className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => setItems((xs) => xs.filter((x) => x.id !== it.id))} aria-label="Remove slide"><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div></div>
      </div>)}
    </div>
    <p className="text-xs text-muted-foreground">Changes appear on the site after you press Save carousel.</p>
  </CardContent></Card>;
};
export default RentalUpdatesPanel;
