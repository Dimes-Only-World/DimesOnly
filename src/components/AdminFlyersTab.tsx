import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAdminUserId } from "@/lib/adminAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Upload, Download } from "lucide-react";

interface Flyer { id: string; title: string; url: string; sort_order: number; is_active: boolean }

const call = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke("make-money", { body: { ...body, adminUserId: getAdminUserId() } });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
};

const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] || "");
    r.onerror = reject;
    r.readAsDataURL(file);
  });

const AdminFlyersTab: React.FC = () => {
  const { toast } = useToast();
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try { setFlyers((await call({ action: "adminListFlyers" })).flyers || []); }
    catch (e) { toast({ title: "Failed to load fliers", description: (e as Error).message, variant: "destructive" }); }
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) return toast({ title: "File must be under 15MB", variant: "destructive" });
    setBusy(true);
    try {
      await call({ action: "adminAddFlyer", title, fileName: file.name, contentType: file.type, base64: await toBase64(file) });
      setTitle(""); setFile(null);
      toast({ title: "Flier added" });
      load();
    } catch (e) { toast({ title: "Upload failed", description: (e as Error).message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const update = async (id: string, patch: Partial<Flyer>) => {
    try { await call({ action: "adminUpdateFlyer", id, ...patch }); load(); }
    catch (e) { toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" }); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this flier?")) return;
    try { await call({ action: "adminDeleteFlyer", id }); load(); }
    catch (e) { toast({ title: "Delete failed", description: (e as Error).message, variant: "destructive" }); }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Add a Flier</CardTitle></CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-3">
          <Input placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <Button onClick={add} disabled={!file || busy}><Upload className="w-4 h-4 mr-2" />{busy ? "Uploading…" : "Upload"}</Button>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {flyers.map((f) => (
          <Card key={f.id} className={f.is_active ? "" : "opacity-60"}>
            <CardContent className="p-4 space-y-2">
              <img src={f.url} alt={f.title} className="w-full rounded border object-contain bg-muted" />
              <Input defaultValue={f.title} placeholder="Title" onBlur={(e) => e.target.value !== f.title && update(f.id, { title: e.target.value })} />
              <div className="flex items-center gap-2">
                <Input type="number" className="w-20" defaultValue={f.sort_order} onBlur={(e) => Number(e.target.value) !== f.sort_order && update(f.id, { sort_order: Number(e.target.value) })} />
                <Button variant="outline" size="sm" onClick={() => update(f.id, { is_active: !f.is_active })}>{f.is_active ? "Hide" : "Show"}</Button>
                <Button variant="outline" size="icon" asChild><a href={f.url} target="_blank" rel="noreferrer" download><Download className="w-4 h-4" /></a></Button>
                <Button variant="destructive" size="icon" onClick={() => remove(f.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminFlyersTab;
