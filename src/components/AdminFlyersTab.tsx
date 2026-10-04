import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAdminUserId } from "@/lib/adminAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Upload, Download, MessageSquare, Plus, Save } from "lucide-react";

interface Flyer { id: string; title: string; url: string; sort_order: number; is_active: boolean }
interface ShareMessage { id: string; title: string; body: string; sort_order: number; is_active: boolean }

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
  const [messages, setMessages] = useState<ShareMessage[]>([]);
  const [messageTitle, setMessageTitle] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [messageBusy, setMessageBusy] = useState(false);

  const load = async () => {
    try { setFlyers((await call({ action: "adminListFlyers" })).flyers || []); }
    catch (e) { toast({ title: "Failed to load fliers", description: (e as Error).message, variant: "destructive" }); }
  };
  const loadMessages = async () => {
    try { setMessages((await call({ action: "adminListMessages" })).messages || []); }
    catch (e) { toast({ title: "Failed to load messages", description: (e as Error).message, variant: "destructive" }); }
  };
  useEffect(() => { load(); loadMessages(); }, []);

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

  const addMessage = async () => {
    if (!messageBody.trim()) return;
    setMessageBusy(true);
    try {
      await call({ action: "adminAddMessage", title: messageTitle.trim(), body: messageBody.trim() });
      setMessageTitle("");
      setMessageBody("");
      toast({ title: "Message added" });
      loadMessages();
    } catch (e) { toast({ title: "Message failed to save", description: (e as Error).message, variant: "destructive" }); }
    finally { setMessageBusy(false); }
  };

  const updateMessage = async (id: string, patch: Partial<ShareMessage>) => {
    try {
      await call({ action: "adminUpdateMessage", id, ...patch });
      toast({ title: "Message saved" });
      loadMessages();
    } catch (e) { toast({ title: "Message failed to save", description: (e as Error).message, variant: "destructive" }); }
  };

  const removeMessage = async (id: string) => {
    if (!confirm("Delete this message?")) return;
    try { await call({ action: "adminDeleteMessage", id }); loadMessages(); }
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Add a Ready-to-Send Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Message title" value={messageTitle} onChange={(e) => setMessageTitle(e.target.value)} maxLength={120} />
          <Textarea
            placeholder="Write the message here. The member's referral URL is added automatically."
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            className="min-h-40"
            maxLength={5000}
          />
          <p className="text-xs text-muted-foreground">Every member will automatically see their own link at the end: www.DimesOnly.World?ref=username</p>
          <Button onClick={addMessage} disabled={!messageBody.trim() || messageBusy}>
            <Plus className="mr-2 h-4 w-4" /> {messageBusy ? "Adding…" : "Add Message"}
          </Button>
        </CardContent>
      </Card>
      <div className="space-y-3">
        {messages.map((message) => (
          <MessageEditor key={message.id} message={message} onSave={updateMessage} onDelete={removeMessage} />
        ))}
      </div>
    </div>
  );
};

const MessageEditor: React.FC<{
  message: ShareMessage;
  onSave: (id: string, patch: Partial<ShareMessage>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}> = ({ message, onSave, onDelete }) => {
  const [title, setTitle] = useState(message.title);
  const [body, setBody] = useState(message.body);
  const [sortOrder, setSortOrder] = useState(message.sort_order);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!body.trim()) return;
    setSaving(true);
    await onSave(message.id, { title: title.trim(), body: body.trim(), sort_order: sortOrder });
    setSaving(false);
  };
  return (
    <Card className={message.is_active ? "" : "opacity-60"}>
      <CardContent className="space-y-3 p-4">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Message title" maxLength={120} />
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-36" maxLength={5000} />
        <p className="text-xs text-muted-foreground">The member's personal referral URL is added automatically.</p>
        <div className="flex flex-wrap items-center gap-2">
          <Input type="number" min={0} max={10000} className="w-24" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} aria-label="Message order" />
          <Button onClick={save} disabled={saving || !body.trim()}><Save className="mr-2 h-4 w-4" />{saving ? "Saving…" : "Save"}</Button>
          <Button variant="outline" onClick={() => onSave(message.id, { is_active: !message.is_active })}>{message.is_active ? "Hide" : "Show"}</Button>
          <Button variant="destructive" size="icon" onClick={() => onDelete(message.id)} aria-label="Delete message"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminFlyersTab;
