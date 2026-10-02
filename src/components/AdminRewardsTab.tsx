import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { callRewards, Contest, REWARD_CATEGORIES, REWARD_AUDIENCES, fmtScore } from "@/lib/rewards";
import { Loader2, Search, Upload, X } from "lucide-react";

const toLocal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
const blank = () => ({
  title: "", description: "", prize_amount: "200", prize_label: "", category: "dimes_recruited", contest_type: "goal", goal: "20",
  audience: Object.keys(REWARD_AUDIENCES), starts_at: toLocal(new Date()), ends_at: "", background_image_url: "", featured_user_id: "", featured_user: null,
});

type SearchUser = { id: string; username: string; avatar: string | null };

const AdminRewardsTab: React.FC = () => {
  const { toast } = useToast();
  const [list, setList] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>(blank());
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userTerm, setUserTerm] = useState("");
  const [userResults, setUserResults] = useState<SearchUser[]>([]);
  const backgroundInput = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try { setList((await callRewards<{ contests: Contest[] }>("adminList")).contests); }
    catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (userTerm.trim().length < 2) { setUserResults([]); return; }
    const timer = window.setTimeout(() => {
      callRewards<{ users: SearchUser[] }>("searchUsers", { term: userTerm }).then((d) => setUserResults(d.users || [])).catch(() => setUserResults([]));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [userTerm]);

  const act = async (action: string, extra: any, msg: string) => {
    try { await callRewards(action, extra); toast({ title: msg }); load(); }
    catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const save = async () => {
    setSaving(true);
    const payload = { ...form, featured_user: undefined, prize_amount: Number(form.prize_amount), goal: Number(form.goal), starts_at: new Date(form.starts_at).toISOString(), ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null };
    try {
      await callRewards(editId ? "update" : "create", editId ? { id: editId, payload } : { payload });
      toast({ title: editId ? "Contest updated" : "Contest created" });
      setForm(blank()); setEditId(null); load();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const edit = (c: Contest) => {
    setEditId(c.id);
    setForm({ ...c, prize_amount: String(c.prize_amount), goal: String(c.goal || ""), prize_label: c.prize_label || "", description: c.description || "", background_image_url: c.background_image_url || "", featured_user_id: c.featured_user_id || "", featured_user: c.featured_user, starts_at: toLocal(new Date(c.starts_at)), ends_at: c.ends_at ? toLocal(new Date(c.ends_at)) : "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const uploadBackground = async (file?: File) => {
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) { toast({ title: "Choose an image or video", variant: "destructive" }); return; }
    const maxBytes = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxBytes) { toast({ title: `${isVideo ? "Video" : "Image"} must be under ${isVideo ? "100MB" : "10MB"}`, variant: "destructive" }); return; }
    setUploading(true);
    try {
      const signed = await callRewards<{ path: string; token: string; url: string }>("signBackgroundUpload", {
        fileName: file.name, contentType: file.type, fileSize: file.size,
      });
      const { error } = await supabase.storage.from("promo-videos").uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
      if (error) throw error;
      set("background_image_url", signed.url);
    } catch (e) {
      toast({ title: "Upload failed", description: e instanceof Error ? e.message : "Could not upload background", variant: "destructive" });
    } finally { setUploading(false); }
  };

  const isVideoBackground = (url: string) => /\.(mp4|webm|mov|m4v)(?:$|\?)/i.test(url);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>{editId ? "Edit contest" : "Create a reward / bonus contest"}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 md:col-span-2"><span className="text-sm font-medium">Title</span>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="First person to get 20 Dimes wins $200" /></label>
          <label className="space-y-1 md:col-span-2"><span className="text-sm font-medium">Description (optional)</span>
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} /></label>
          <label className="space-y-1"><span className="text-sm font-medium">Category</span>
            <select className="h-10 w-full rounded-md border bg-background px-3" value={form.category} onChange={(e) => set("category", e.target.value)}>
              {Object.entries(REWARD_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select></label>
          <label className="space-y-1"><span className="text-sm font-medium">Type</span>
            <select className="h-10 w-full rounded-md border bg-background px-3" value={form.contest_type} onChange={(e) => set("contest_type", e.target.value)}>
              <option value="most">Most by expiration date</option>
              <option value="release">At app release party</option>
              <option value="goal" disabled={form.category === "highest_rated"}>First to reach a goal</option>
            </select></label>
          {form.contest_type === "goal" && (
            <label className="space-y-1"><span className="text-sm font-medium">Goal ({REWARD_CATEGORIES[form.category]?.unit})</span>
              <Input type="number" min={1} value={form.goal} onChange={(e) => set("goal", e.target.value)} /></label>
          )}
          <label className="space-y-1"><span className="text-sm font-medium">Prize amount ($)</span>
            <Input type="number" min={0} value={form.prize_amount} onChange={(e) => set("prize_amount", e.target.value)} /></label>
          <label className="space-y-1"><span className="text-sm font-medium">Prize label (optional, e.g. "$200 + VIP table")</span>
            <Input value={form.prize_label} onChange={(e) => set("prize_label", e.target.value)} /></label>
          <label className="space-y-1"><span className="text-sm font-medium">Starts</span>
            <Input type="datetime-local" value={form.starts_at} onChange={(e) => set("starts_at", e.target.value)} /></label>
          <label className="space-y-1"><span className="text-sm font-medium">Expires {form.contest_type !== "most" ? "(optional)" : ""}</span>
            <Input type="datetime-local" value={form.ends_at} onChange={(e) => set("ends_at", e.target.value)} /></label>
          <div className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">Background image or video (optional)</span>
            <input ref={backgroundInput} type="file" accept="image/*,video/mp4,video/webm,video/quicktime" className="hidden" onChange={(e) => { uploadBackground(e.target.files?.[0]); e.currentTarget.value = ""; }} />
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" onClick={() => backgroundInput.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}{uploading ? "Uploading…" : "Upload image or video"}
              </Button>
              {form.background_image_url && <>{isVideoBackground(form.background_image_url) ? <video src={form.background_image_url} muted loop playsInline autoPlay className="h-16 w-28 rounded object-cover" /> : <img src={form.background_image_url} alt="Contest background preview" className="h-16 w-28 rounded object-cover" />}<Button type="button" size="icon" variant="ghost" aria-label="Remove background" onClick={() => set("background_image_url", "")}><X className="h-4 w-4" /></Button></>}
            </div>
          </div>
          <div className="relative space-y-2 md:col-span-2">
            <span className="text-sm font-medium">Featured member in title (optional)</span>
            {form.featured_user ? (
              <div className="flex items-center gap-3 rounded-md border p-2">
                {form.featured_user.avatar ? <img src={form.featured_user.avatar} alt="" className="h-10 w-10 rounded-full object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-bold">{form.featured_user.username?.[0]?.toUpperCase()}</div>}
                <span className="font-medium">@{form.featured_user.username}</span>
                <Button type="button" size="icon" variant="ghost" className="ml-auto" aria-label="Remove featured member" onClick={() => { setForm((f: any) => ({ ...f, featured_user: null, featured_user_id: "" })); setUserTerm(""); }}><X className="h-4 w-4" /></Button>
              </div>
            ) : <>
              <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={userTerm} onChange={(e) => setUserTerm(e.target.value)} placeholder="Search by username" className="pl-9" /></div>
              {userResults.length > 0 && <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-lg">
                {userResults.map((u) => <Button key={u.id} type="button" variant="ghost" className="h-auto w-full justify-start gap-3 p-2" onClick={() => { setForm((f: any) => ({ ...f, featured_user_id: u.id, featured_user: { user_id: u.id, username: u.username, avatar: u.avatar } })); setUserResults([]); setUserTerm(""); }}>
                  {u.avatar ? <img src={u.avatar} alt="" className="h-9 w-9 rounded-full object-cover" /> : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted font-bold">{u.username[0]?.toUpperCase()}</span>}<span>@{u.username}</span>
                </Button>)}
              </div>}
            </>}
          </div>
          <div className="space-y-1 md:col-span-2"><span className="text-sm font-medium">Who can win</span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(REWARD_AUDIENCES).map(([k, v]) => {
                const on = form.audience.includes(k);
                return <Button key={k} type="button" size="sm" variant={on ? "default" : "outline"}
                  onClick={() => set("audience", on ? form.audience.filter((a: string) => a !== k) : [...form.audience, k])}>{v}</Button>;
              })}
            </div></div>
          <div className="flex gap-2 md:col-span-2">
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : editId ? "Save changes" : "Create contest"}</Button>
            {editId && <Button variant="outline" onClick={() => { setEditId(null); setForm(blank()); }}>Cancel</Button>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Contests</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : list.length === 0 ? <p className="text-sm text-muted-foreground">No contests yet.</p> :
            list.map((c) => {
              const cat = REWARD_CATEGORIES[c.category];
              return (
                <div key={c.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{cat?.icon} {c.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {cat?.label} · {c.contest_type === "goal" ? `First to ${c.goal}` : c.contest_type === "release" ? "At app release party" : "Most by expiration"} · ${Number(c.prize_amount).toLocaleString()} ·
                         {" "}{new Date(c.starts_at).toLocaleString()} → {c.ends_at ? new Date(c.ends_at).toLocaleString() : "No expiration"}
                      </p>
                      <p className="text-xs text-muted-foreground">{c.audience.map((a) => REWARD_AUDIENCES[a]).join(", ")} · {c.participants} competing</p>
                    </div>
                    <Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}{c.paid_at ? " · paid" : ""}</Badge>
                  </div>
                  {c.winner ? (
                    <p className="mt-2 text-sm">Winner: <a className="font-semibold underline" href={`/profile/${c.winner.username}`}>@{c.winner.username}</a> ({fmtScore(c.category, c.winner.score)})</p>
                  ) : c.leaders.length > 0 && (
                    <p className="mt-2 text-sm text-muted-foreground">Leading: {c.leaders.slice(0, 3).map((l) => `@${l.username} (${fmtScore(c.category, l.score)})`).join(", ")}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => edit(c)}>Edit</Button>
                    {c.status === "active" && <Button size="sm" variant="outline" onClick={() => act("setStatus", { id: c.id, status: "paused" }, "Paused")}>Pause</Button>}
                    {c.status === "paused" && <Button size="sm" variant="outline" onClick={() => act("setStatus", { id: c.id, status: "active" }, "Resumed")}>Resume</Button>}
                    {["active", "paused"].includes(c.status) && <Button size="sm" variant="outline" onClick={() => confirm("End now and award the current leader?") && act("setStatus", { id: c.id, status: "ended" }, "Contest ended")}>End now</Button>}
                    {c.winner && <Button size="sm" onClick={() => act("markPaid", { id: c.id, paid: !c.paid_at }, c.paid_at ? "Marked unpaid" : "Marked paid")}>{c.paid_at ? "Mark unpaid" : "Mark prize paid"}</Button>}
                    <Button size="sm" variant="destructive" onClick={() => confirm("Delete this contest?") && act("delete", { id: c.id }, "Deleted")}>Delete</Button>
                  </div>
                </div>
              );
            })}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRewardsTab;
