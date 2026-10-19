import { ratesFromMonthlyPayment, DEFAULT_MARKUPS, type Markups } from "@/lib/vehicleCostPricing";
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAdminUserId } from "@/lib/adminAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import HostApplicationsPanel from "@/components/rentals/HostApplicationsPanel";
import PurchaseApplicationsPanel from "@/components/rentals/PurchaseApplicationsPanel";
import RentalHoldsPanel from "@/components/rentals/RentalHoldsPanel";
import PurchaseBackgroundsPanel from "@/components/rentals/PurchaseBackgroundsPanel";
import RentalUpdatesPanel from "@/components/rentals/RentalUpdatesPanel";
import SaleCommissionsPanel from "@/components/rentals/SaleCommissionsPanel";
import PaymentHistoryPanel from "@/components/rentals/PaymentHistoryPanel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Trash2, Plus, Upload, ExternalLink, Download } from "lucide-react";
import { lateFeeStatus } from "@/lib/rentalExtensionRules";

const RENTAL_OPTS = ["daily", "weekly", "monthly", "long_term", "rent_to_own", "purchase"];

async function callAdmin(action: string, extra: Record<string, any> = {}) {
  const adminUserId = getAdminUserId();
  if (!adminUserId) throw new Error("Admin session missing. Please re-login.");
  const { data, error } = await supabase.functions.invoke("rental-admin", {
    body: { action, adminUserId, ...extra },
  });
  if (error) {
    let message = error.message;
    try {
      const body = await (error as any).context?.json?.();
      if (body?.error) message = body.error;
    } catch { /* keep generic message */ }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || "");
      const idx = s.indexOf(",");
      resolve(idx >= 0 ? s.slice(idx + 1) : s);
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });

const ACTIVE_STATUSES = ["active", "in_progress", "picked_up", "confirmed", "paid"];
const isOverdue = (b: any) => {
  if (!ACTIVE_STATUSES.includes(String(b.status || "").toLowerCase()) || !b.end_date || b.returned_at) return false;
  return lateFeeStatus(new Date(b.end_date).getTime(), Date.now(), Number(b.vehicles?.day_rate || 0), b.vehicles?.hour_rate).isLate;
};
const isExpired = (b: any) => ["pending", "approved"].includes(b.status) && !!b.start_date && Date.now() - new Date(b.start_date).getTime() > 24 * 3600 * 1000;

const readSub = () => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("sub"));

const AdminRentalsTab: React.FC = () => {
  const [tab, setTabState] = useState(() => readSub() || "vehicles");
  const setTab = (v: string) => {
    setTabState(v);
    const url = new URL(window.location.href); url.searchParams.set("sub", v);
    window.history.replaceState(window.history.state, "", url.toString());
  };
  const [bookingFilter, setBookingFilter] = useState<"all" | "overdue" | "expired">("all");
  const [loaded, setLoaded] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [callRequests, setCallRequests] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);

  const loadAll = async () => {
    try {
      const [vs, bs, cs, crs] = await Promise.all([
        callAdmin("listVehicles"),
        callAdmin("listBookings"),
        callAdmin("listCommissions"),
        callAdmin("listCallRequests"),
      ]);
      setVehicles(vs?.data || []);
      setBookings(bs?.data || []);
      setCommissions(cs?.data || []);
      setCallRequests(crs?.data || []);
    } catch (e: any) {
      toast({ title: "Load failed", description: e.message, variant: "destructive" });
    } finally { setLoaded(true); }
  };

  useEffect(() => { loadAll(); }, []);

  return (
    <div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
          <TabsTrigger value="calls">Call Requests</TabsTrigger>
          <TabsTrigger value="hosts">Host Applications</TabsTrigger>
          <TabsTrigger value="purchases">Credit Apps</TabsTrigger>
          <TabsTrigger value="holds">Notify Me Holds</TabsTrigger>
          <TabsTrigger value="sales">Sale Commissions</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="packages">Themed Packages</TabsTrigger>
          <TabsTrigger value="promos">Promo Codes</TabsTrigger>
          <TabsTrigger value="captures">Captures</TabsTrigger>
          <TabsTrigger value="contests">Contests</TabsTrigger>
        </TabsList>

        <TabsContent value="vehicles" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Add Vehicle
            </Button>
          </div>
          {showForm && (
            <VehicleForm
              initial={editing}
              onClose={() => setShowForm(false)}
              onSaved={(v) => { setEditing(v); loadAll(); }}
            />
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {vehicles.map((v) => (
              <Card key={v.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{v.year} {v.make} {v.model}</p>
                    <p className="text-xs text-muted-foreground">{v.vehicle_type} · {v.pickup_location}</p>
                    <p className="text-xs">Options: {(v.rental_options || []).join(", ")}</p>
                    <p className="text-xs">Active: {v.is_active ? "yes" : "no"} · {v.availability_status}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button size="sm" variant="outline" onClick={() => { setEditing(v); setShowForm(true); }}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={async () => {
                      if (!confirm("Delete vehicle and all its media?")) return;
                      try { await callAdmin("deleteVehicle", { id: v.id }); loadAll(); }
                      catch (e: any) { toast({ title: "Delete failed", description: e.message, variant: "destructive" }); }
                    }}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="bookings" className="space-y-3">
          {(() => {
            const counts = { all: bookings.length, overdue: bookings.filter(isOverdue).length, expired: bookings.filter(isExpired).length };
            const shown = bookings.filter((b) => bookingFilter === "overdue" ? isOverdue(b) : bookingFilter === "expired" ? isExpired(b) : true);
            return <>
              <div className="flex flex-wrap items-center gap-2">
                {(["all", "overdue", "expired"] as const).map((f) => (
                  <Button key={f} size="sm" variant={bookingFilter === f ? "default" : "outline"} onClick={() => setBookingFilter(f)} className="capitalize">
                    {f} ({counts[f]})
                  </Button>
                ))}
                {counts.expired > 0 && <Button size="sm" variant="destructive" onClick={async () => {
                  if (!confirm(`Cancel ${counts.expired} expired pending booking(s)? They are unpaid and more than 24 hours past their start date.`)) return;
                  try { for (const b of bookings.filter(isExpired)) await callAdmin("updateBookingStatus", { id: b.id, status: "cancelled" }); toast({ title: "Expired bookings cleared" }); loadAll(); }
                  catch (e: any) { toast({ title: "Clear failed", description: e.message, variant: "destructive" }); }
                }}>Clear expired</Button>}
              </div>
              {shown.map((b) => <BookingRow key={b.id} b={b} onChange={loadAll} />)}
              {shown.length === 0 && <p className="text-muted-foreground">{loaded ? "No bookings here." : "Loading bookings…"}</p>}
            </>;
          })()}
        </TabsContent>

        <TabsContent value="payments">
          <PaymentHistoryPanel callAdmin={callAdmin} />
        </TabsContent>

        <TabsContent value="calls" className="space-y-3">
          {callRequests.map((r) => (
            <CallRequestRow key={r.id} r={r} onChange={loadAll} />
          ))}
          {callRequests.length === 0 && <p className="text-muted-foreground">No call requests yet.</p>}
        </TabsContent>

        <TabsContent value="hosts"><HostApplicationsPanel callAdmin={callAdmin} /></TabsContent>
        <TabsContent value="purchases" className="space-y-4"><RentalUpdatesPanel callAdmin={callAdmin} /><PurchaseBackgroundsPanel callAdmin={callAdmin} /><PurchaseApplicationsPanel callAdmin={callAdmin} /></TabsContent>
        <TabsContent value="holds"><RentalHoldsPanel callAdmin={callAdmin} /></TabsContent>
        <TabsContent value="sales"><SaleCommissionsPanel callAdmin={callAdmin} /></TabsContent>

        <TabsContent value="commissions" className="space-y-3">
          {commissions.map((c) => (
            <Card key={c.id}><CardContent className="p-3 text-sm flex items-center justify-between">
              <div>
                <p>User {c.user_id.slice(0, 8)} · {c.commission_type} · ${Number(c.amount).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Booking {c.booking_id.slice(0, 8)} · {c.status}</p>
              </div>
              {c.status === "pending" && (
                <Button size="sm" onClick={async () => {
                  try { await callAdmin("updateCommissionStatus", { id: c.id, status: "paid" }); loadAll(); }
                  catch (e: any) { toast({ title: "Update failed", description: e.message, variant: "destructive" }); }
                }}>Mark paid</Button>
              )}
            </CardContent></Card>
          ))}
          {commissions.length === 0 && <p className="text-muted-foreground">No commissions yet.</p>}
        </TabsContent>

        <TabsContent value="packages"><PackagesPanel /></TabsContent>
        <TabsContent value="promos" className="space-y-4">
          <PromoCodesPanel />
        </TabsContent>

        <TabsContent value="captures"><CapturesPanel /></TabsContent>
        <TabsContent value="contests"><ContestsPanel /></TabsContent>
      </Tabs>
    </div>
  );
};

// ============ Themed Packages Admin ============
const CALL_STATUSES = ["new", "contacted", "completed", "cancelled"];

const CallRequestRow: React.FC<{ r: any; onChange: () => void }> = ({ r, onChange }) => {
  const [saving, setSaving] = useState(false);
  const dateLabel = r.scheduled_date
    ? new Date(`${r.scheduled_date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
    : "";

  const setStatus = async (status: string) => {
    setSaving(true);
    try {
      await callAdmin("updateCallRequest", { id: r.id, payload: { status } });
      toast({ title: "Updated", description: `Call request marked ${status}.` });
      onChange();
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="font-semibold">{r.name} — {dateLabel} at {r.scheduled_time}</p>
          <p className="text-sm text-muted-foreground">{r.email} · {r.phone}</p>
          {r.vehicle && <p className="text-sm text-muted-foreground">Vehicle: {r.vehicle}</p>}
          <p className="text-xs text-muted-foreground">{r.timezone} · Requested {new Date(r.created_at).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={r.status} onValueChange={setStatus} disabled={saving}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};

const PackagesPanel: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const load = async () => {
    try { const r = await callAdmin("listPackages"); setRows(r?.data || []); }
    catch (e: any) { toast({ title: "Load failed", description: e.message, variant: "destructive" }); }
  };
  useEffect(() => { load(); }, []);
  const blank = { name: "", slug: "", description: "", icon: "", price: 0, is_active: true };
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setEditing(blank)}><Plus className="w-4 h-4 mr-1" /> New Package</Button>
      </div>
      {editing && (
        <Card><CardContent className="p-4 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>Name</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
            <div><Label>Slug</Label><Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="date-night" /></div>
            <div><Label>Icon (emoji)</Label><Input value={editing.icon || ""} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} placeholder="💎" /></div>
            <div><Label>Price ($)</Label><Input type="number" value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} /></div>
          </div>
          <div><Label>Description</Label><Textarea value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: !!v })} /> Active
          </label>
          <div className="flex gap-2">
            <Button onClick={async () => {
              try { await callAdmin("upsertPackage", { payload: editing }); setEditing(null); load(); }
              catch (e: any) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); }
            }}>Save</Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </CardContent></Card>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map((p) => (
          <Card key={p.id}><CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="font-semibold">{p.icon} {p.name} <span className="text-primary">${p.price}</span></p>
              <p className="text-xs text-muted-foreground">{p.slug} · {p.is_active ? "active" : "inactive"}</p>
              {p.description && <p className="text-xs mt-1">{p.description}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <Button size="sm" variant="outline" onClick={() => setEditing(p)}>Edit</Button>
              <Button size="sm" variant="destructive" onClick={async () => {
                if (!confirm("Delete package?")) return;
                try { await callAdmin("deletePackage", { id: p.id }); load(); }
                catch (e: any) { toast({ title: "Delete failed", description: e.message, variant: "destructive" }); }
              }}><Trash2 className="w-3 h-3" /></Button>
            </div>
          </CardContent></Card>
        ))}
        {rows.length === 0 && <p className="text-muted-foreground text-sm">No packages yet.</p>}
      </div>
    </div>
  );
};

// ============ Captures Admin ============
const CapturesPanel: React.FC = () => {
  const [filter, setFilter] = useState<string>("pending");
  const [rows, setRows] = useState<any[]>([]);
  const [contests, setContests] = useState<any[]>([]);
  const load = async () => {
    try {
      const r = await callAdmin("listCaptures", { status: filter || undefined });
      setRows(r?.data || []);
      const c = await callAdmin("listContests");
      setContests(c?.data || []);
    } catch (e: any) { toast({ title: "Load failed", description: e.message, variant: "destructive" }); }
  };
  useEffect(() => { load(); }, [filter]);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Label>Status</Label>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map((c) => (
          <Card key={c.id}><CardContent className="p-3 space-y-2">
            <div className="aspect-video bg-muted rounded overflow-hidden">
              {c.media_type === "video"
                ? <video src={c.url} controls className="w-full h-full object-cover" />
                : <img src={c.url} className="w-full h-full object-cover" />}
            </div>
            <p className="text-xs text-muted-foreground">
              {c.vehicles ? `${c.vehicles.year} ${c.vehicles.make} ${c.vehicles.model}` : "—"} · {new Date(c.created_at).toLocaleDateString()}
            </p>
            {c.caption && <p className="text-sm line-clamp-2">{c.caption}</p>}
            <div className="flex flex-wrap gap-1">
              {c.moderation_status !== "approved" && (
                <Button size="sm" onClick={async () => { await callAdmin("moderateCapture", { id: c.id, status: "approved" }); load(); }}>Approve</Button>
              )}
              {c.moderation_status !== "rejected" && (
                <Button size="sm" variant="destructive" onClick={async () => { await callAdmin("moderateCapture", { id: c.id, status: "rejected" }); load(); }}>Reject</Button>
              )}
              <Button size="sm" variant={c.is_featured ? "default" : "outline"}
                onClick={async () => { await callAdmin("toggleFeaturedCapture", { id: c.id, is_featured: !c.is_featured }); load(); }}>
                {c.is_featured ? "Unfeature" : "Feature"}
              </Button>
              <Button size="sm" variant="ghost" onClick={async () => {
                if (!confirm("Delete capture?")) return;
                await callAdmin("deleteCapture", { id: c.id, storagePath: c.storage_path }); load();
              }}><Trash2 className="w-3 h-3" /></Button>
            </div>
            {contests.length > 0 && (
              <Select value={c.contest_id || "__none"} onValueChange={async (v) => {
                await callAdmin("assignCaptureToContest", { id: c.id, contest_id: v === "__none" ? null : v }); load();
              }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Assign contest" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No contest</SelectItem>
                  {contests.map((ct) => <SelectItem key={ct.id} value={ct.id}>{ct.title}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </CardContent></Card>
        ))}
        {rows.length === 0 && <p className="text-muted-foreground text-sm">No captures.</p>}
      </div>
    </div>
  );
};

// ============ Contests Admin ============
const ContestsPanel: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const load = async () => {
    try { const r = await callAdmin("listContests"); setRows(r?.data || []); }
    catch (e: any) { toast({ title: "Load failed", description: e.message, variant: "destructive" }); }
  };
  const loadEntries = async (contestId: string) => {
    try {
      const r = await callAdmin("listCaptures", { status: "approved" });
      setEntries((r?.data || []).filter((c: any) => c.contest_id === contestId));
    } catch (e: any) { toast({ title: "Load failed", description: e.message, variant: "destructive" }); }
  };
  useEffect(() => { load(); }, []);
  const blank = { title: "", description: "", prize: "", starts_at: "", ends_at: "", status: "active" };
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setEditing(blank)}><Plus className="w-4 h-4 mr-1" /> New Contest</Button>
      </div>
      {editing && (
        <Card><CardContent className="p-4 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>Title</Label><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
            <div><Label>Prize</Label><Input value={editing.prize || ""} onChange={(e) => setEditing({ ...editing, prize: e.target.value })} /></div>
            <div><Label>Starts at</Label><Input type="datetime-local" value={editing.starts_at || ""} onChange={(e) => setEditing({ ...editing, starts_at: e.target.value })} /></div>
            <div><Label>Ends at</Label><Input type="datetime-local" value={editing.ends_at || ""} onChange={(e) => setEditing({ ...editing, ends_at: e.target.value })} /></div>
            <div><Label>Status</Label>
              <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="ended">Ended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Description</Label><Textarea value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
          <div className="flex gap-2">
            <Button onClick={async () => {
              try { await callAdmin("upsertContest", { payload: editing }); setEditing(null); load(); }
              catch (e: any) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); }
            }}>Save</Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </CardContent></Card>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map((c) => (
          <Card key={c.id}><CardContent className="p-3 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{c.title}</p>
                <p className="text-xs text-muted-foreground">{c.status} · Prize: {c.prize || "—"}</p>
                <p className="text-xs text-muted-foreground">{c.starts_at ? new Date(c.starts_at).toLocaleDateString() : "—"} → {c.ends_at ? new Date(c.ends_at).toLocaleDateString() : "—"}</p>
              </div>
              <div className="flex flex-col gap-1">
                <Button size="sm" variant="outline" onClick={() => setEditing(c)}>Edit</Button>
                <Button size="sm" variant="outline" onClick={() => loadEntries(c.id)}>View entries</Button>
                <Button size="sm" variant="destructive" onClick={async () => {
                  if (!confirm("Delete contest?")) return;
                  await callAdmin("deleteContest", { id: c.id }); load();
                }}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
            {c.winner_capture_id && <p className="text-xs text-primary">Winner picked</p>}
            {entries.length > 0 && entries[0]?.contest_id === c.id && (
              <div className="border-t pt-2 space-y-1">
                <p className="text-xs font-semibold">Approved entries ({entries.length})</p>
                <div className="grid grid-cols-3 gap-1">
                  {entries.map((e) => (
                    <div key={e.id} className="relative">
                      <img src={e.url} className="w-full aspect-square object-cover rounded" />
                      <Button size="sm" className="absolute inset-x-0 bottom-0 text-[10px] h-6"
                        onClick={async () => { await callAdmin("pickContestWinner", { id: c.id, winner_capture_id: e.id }); setEntries([]); load(); }}>
                        Pick winner
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent></Card>
        ))}
        {rows.length === 0 && <p className="text-muted-foreground text-sm">No contests yet.</p>}
      </div>
    </div>
  );
};

const PromoCodesPanel: React.FC = () => {
  const [codes, setCodes] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ code: "", description: "", discount_type: "percent", discount_value: 10, is_active: true, max_uses: "", expires_at: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await callAdmin("listPromoCodes");
      setCodes(res?.data || []);
    } catch (e: any) {
      toast({ title: "Load failed", description: e.message, variant: "destructive" });
    }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      await callAdmin("upsertPromoCode", {
        payload: {
          id: form.id,
          code: form.code,
          description: form.description || null,
          discount_type: form.discount_type,
          discount_value: Number(form.discount_value) || 0,
          is_active: !!form.is_active,
          max_uses: form.max_uses === "" ? null : Number(form.max_uses),
          expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        },
      });
      toast({ title: "Promo code saved" });
      setForm({ code: "", description: "", discount_type: "percent", discount_value: 10, is_active: true, max_uses: "", expires_at: "" });
      load();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <Card><CardContent className="p-4 space-y-3">
        <h3 className="font-semibold">{form.id ? "Edit" : "New"} Promo Code</h3>
        <p className="text-xs text-muted-foreground">Each code can be used one time per signed-in member.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SUMMER10" /></div>
          <div><Label>Discount Type</Label>
            <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">Percent (%)</SelectItem>
                <SelectItem value="amount">Fixed amount ($)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Value</Label><Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} /></div>
          <div><Label>Max Total Uses (blank = unlimited)</Label><Input type="number" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} /></div>
          <div><Label>Expires</Label><Input type="date" value={form.expires_at ? String(form.expires_at).slice(0, 10) : ""} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></div>
          <div className="flex items-end"><label className="flex items-center gap-2 text-sm"><Checkbox checked={!!form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: !!v })} /> Active</label></div>
        </div>
        <div><Label>Description</Label><Input value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="flex gap-2">
          <Button onClick={save} disabled={saving || !form.code}>{saving ? "Saving..." : "Save Promo Code"}</Button>
          {form.id && <Button variant="ghost" onClick={() => setForm({ code: "", description: "", discount_type: "percent", discount_value: 10, is_active: true, max_uses: "", expires_at: "" })}>Cancel</Button>}
        </div>
      </CardContent></Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {codes.map((c) => (
          <Card key={c.id}><CardContent className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{c.code} · {c.discount_type === "amount" ? `$${Number(c.discount_value).toLocaleString()}` : `${c.discount_value}%`}</p>
              <p className="text-xs text-muted-foreground">{c.description || "—"}</p>
              <p className="text-xs">Used {c.uses_count || 0}{c.max_uses ? ` / ${c.max_uses}` : ""} · {c.is_active ? "Active" : "Inactive"}{c.expires_at ? ` · expires ${new Date(c.expires_at).toLocaleDateString()}` : ""}</p>
            </div>
            <div className="flex flex-col gap-1">
              <Button size="sm" variant="outline" onClick={() => setForm({ ...c, max_uses: c.max_uses ?? "" })}>Edit</Button>
              <Button size="sm" variant="destructive" onClick={async () => {
                if (!confirm(`Delete promo code ${c.code}?`)) return;
                try { await callAdmin("deletePromoCode", { id: c.id }); load(); }
                catch (e: any) { toast({ title: "Delete failed", description: e.message, variant: "destructive" }); }
              }}><Trash2 className="w-3 h-3" /></Button>
            </div>
          </CardContent></Card>
        ))}
        {codes.length === 0 && <p className="text-muted-foreground">No promo codes yet.</p>}
      </div>
    </div>
  );
};

const VehicleForm: React.FC<{ initial: any | null; onClose: () => void; onSaved: (v: any) => void }> = ({ initial, onClose, onSaved }) => {
  const [markups, setMarkups] = useState<Markups>(DEFAULT_MARKUPS);
  const [f, setF] = useState<any>(initial || {
    year: new Date().getFullYear(), make: "", model: "", vin: "", license_plate: "",
    registration_state: "", plate_expiration: "", body_style: "", color: "", mileage: "",
    description: "", vehicle_type: "", pickup_location: "",
    day_rate: 0, three_day_rate: 0, weekly_rate: 0, monthly_rate: 0, down_payment: 0,
    security_deposit: 0,
    rental_options: ["daily"], availability_status: "available", is_active: true,
  });
  const [currentId, setCurrentId] = useState<string | null>(initial?.id || null);
  const [saving, setSaving] = useState(false);
  const [media, setMedia] = useState<any[]>([]);
  const agreementFieldsMissing = (f.rental_options || []).some((option: string) => option === "long_term" || option === "rent_to_own")
    ? ["vin", "mileage", "registration_state", "license_plate", "plate_expiration", "body_style", "color", "monthly_rate", "down_payment"].filter((field) => !f[field])
    : [];

  const loadMedia = async (vehicleId: string) => {
    try {
      const res = await callAdmin("listMedia", { vehicleId });
      setMedia(res?.data || []);
    } catch (e: any) {
      toast({ title: "Media load failed", description: e.message, variant: "destructive" });
    }
  };

  useEffect(() => { if (currentId) loadMedia(currentId); }, [currentId]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...f,
        day_rate: Number(f.day_rate) || null,
        hour_rate: Number(f.hour_rate) || null,
        three_day_rate: Number(f.three_day_rate) || null,
        security_deposit: Number(f.security_deposit) || 0,
        weekly_rate: Number(f.weekly_rate) || null,
        monthly_rate: Number(f.monthly_rate) || null,
        down_payment: Number(f.down_payment) || null,
        mileage: Number(f.mileage) || null,
        extra_mile_fee: Number(f.extra_mile_fee) || null,
        unlimited_mileage_rate: Number(f.unlimited_mileage_rate) || null,
        our_monthly_payment: f.our_monthly_payment === "" || f.our_monthly_payment == null ? undefined : Number(f.our_monthly_payment),
      };
      delete payload.id; delete payload.created_at; delete payload.updated_at; delete payload.created_by;
      let saved;
      if (currentId) {
        saved = await callAdmin("updateVehicle", { id: currentId, payload });
      } else {
        saved = await callAdmin("createVehicle", { payload });
      }
      const v = saved?.data;
      if (v?.id) setCurrentId(v.id);
      toast({ title: "Saved" });
      onSaved(v);
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const uploadMedia = async (files: FileList | null, mediaType: "photo" | "video") => {
    if (!currentId) { toast({ title: "Save vehicle first", variant: "destructive" }); return; }
    if (!files) return;
    for (const file of Array.from(files)) {
      try {
        const base64 = await fileToBase64(file);
        await callAdmin("uploadMedia", {
          vehicleId: currentId,
          mediaType,
          fileName: file.name,
          contentType: file.type,
          base64,
          sortOrder: media.filter((m) => m.media_type === mediaType).length,
        });
      } catch (e: any) {
        toast({ title: "Upload failed", description: e.message, variant: "destructive" });
      }
    }
    loadMedia(currentId);
  };

  const removeMedia = async (m: any) => {
    try {
      await callAdmin("deleteMedia", { id: m.id, storagePath: m.storage_path });
      loadMedia(currentId!);
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  const setCover = async (m: any) => {
    try {
      await callAdmin("setCoverMedia", { id: m.id, vehicleId: currentId });
      toast({ title: "Cover photo updated" });
      loadMedia(currentId!);
    } catch (e: any) {
      toast({ title: "Could not set cover", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Card><CardContent className="p-4 space-y-3">
      <div className="flex justify-between items-center"><h3 className="font-semibold">{currentId ? "Edit" : "Add"} Vehicle</h3>
        <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div><Label>Year</Label><Input type="number" value={f.year} onChange={(e) => setF({ ...f, year: Number(e.target.value) })} /></div>
        <div><Label>Make</Label><Input value={f.make} onChange={(e) => setF({ ...f, make: e.target.value })} /></div>
        <div><Label>Model</Label><Input value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })} /></div>
        <div><Label>VIN</Label><Input value={f.vin || ""} onChange={(e) => setF({ ...f, vin: e.target.value })} /></div>
        <div><Label>License Plate</Label><Input value={f.license_plate || ""} onChange={(e) => setF({ ...f, license_plate: e.target.value })} /></div>
        <div><Label>Registration State</Label><Input value={f.registration_state || ""} onChange={(e) => setF({ ...f, registration_state: e.target.value.toUpperCase() })} maxLength={2} placeholder="AZ" /></div>
        <div><Label>Plate Expiration</Label><Input type="date" value={f.plate_expiration ? String(f.plate_expiration).slice(0, 10) : ""} onChange={(e) => setF({ ...f, plate_expiration: e.target.value })} /></div>
        <div><Label>Body Style</Label><Input value={f.body_style || ""} onChange={(e) => setF({ ...f, body_style: e.target.value })} placeholder="4-door Sedan" /></div>
        <div><Label>Color</Label><Input value={f.color || ""} onChange={(e) => setF({ ...f, color: e.target.value })} /></div>
        <div><Label>Current Mileage</Label><Input type="number" inputMode="numeric" value={f.mileage || ""} onChange={(e) => setF({ ...f, mileage: e.target.value })} /></div>
        <div><Label>Security Deposit ($)</Label><Input type="number" value={f.security_deposit || 0} onChange={(e) => setF({ ...f, security_deposit: e.target.value })} /></div>
        <div><Label>Vehicle Type</Label><Input value={f.vehicle_type || ""} onChange={(e) => setF({ ...f, vehicle_type: e.target.value })} placeholder="Exotic, SUV, ..." /></div>
        <div><Label>Pickup Location</Label><Input value={f.pickup_location || ""} onChange={(e) => setF({ ...f, pickup_location: e.target.value })} /></div>
        <div><Label>Availability</Label>
          <Select value={f.availability_status} onValueChange={(v) => setF({ ...f, availability_status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="rented">Rented</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2 border border-primary/40 bg-primary/5 p-3">
          <Label>Our Monthly Payment on This Car ($)</Label>
          <Input type="number" min={0} value={f.our_monthly_payment ?? ""} placeholder="e.g. 500"
            onChange={(e) => {
              const v = e.target.value;
              setF(v === "" ? { ...f, our_monthly_payment: "" } : { ...f, our_monthly_payment: v, ...ratesFromMonthlyPayment(Number(v), markups) });
            }} />
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {([
              ["monthlyPct", "Monthly markup %"],
              ["weeklyPct", "Weekly markup %"],
              ["dailyPct", "Daily markup %"],
              ["threeDayDiscountPct", "3+ Day discount %"],
            ] as const).map(([key, label]) => (
              <div key={key} className="min-w-0">
                <Label className="text-xs">{label}</Label>
                <Input type="number" step="0.01" value={markups[key]}
                  onChange={(e) => {
                    const next = { ...markups, [key]: Number(e.target.value) };
                    setMarkups(next);
                    if (f.our_monthly_payment !== "" && f.our_monthly_payment != null) setF({ ...f, ...ratesFromMonthlyPayment(Number(f.our_monthly_payment), next) });
                  }} />
              </div>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Private — never shown to renters. Rates fill in as percentages of your payment: Monthly = payment + monthly %, Weekly = payment + weekly %, Day = (payment ÷ 30) + daily %, 3+ Day = daily rate minus the discount %. You can still edit them.</p>
        </div>
        <div><Label>Day Rate ($)</Label><Input type="number" value={f.day_rate || 0} onChange={(e) => setF({ ...f, day_rate: e.target.value })} /></div>
        <div><Label>Hourly Late Rate ($ / hr)</Label><Input type="number" value={f.hour_rate || ""} onChange={(e) => setF({ ...f, hour_rate: e.target.value })} placeholder="Blank = day rate ÷ 24" /></div>
        <div><Label>3+ Day Rate ($ / day)</Label><Input type="number" value={f.three_day_rate || 0} onChange={(e) => setF({ ...f, three_day_rate: e.target.value })} placeholder="Discounted daily rate for 3+ days" /></div>

        <div><Label>Weekly Rate ($)</Label><Input type="number" value={f.weekly_rate || 0} onChange={(e) => setF({ ...f, weekly_rate: e.target.value })} /></div>
        <div><Label>Monthly Rate ($)</Label><Input type="number" value={f.monthly_rate || 0} onChange={(e) => setF({ ...f, monthly_rate: e.target.value })} /></div>
        <div><Label>Initial Down Payment ($)</Label><Input type="number" value={f.down_payment || 0} onChange={(e) => setF({ ...f, down_payment: e.target.value })} /></div>
        <div><Label>Fee per mile over 200 miles/day ($)</Label><Input type="number" step="0.01" value={f.extra_mile_fee ?? ""} onChange={(e) => setF({ ...f, extra_mile_fee: e.target.value })} placeholder="e.g. 0.44" /></div>
        <div><Label>Unlimited mileage ($ / day)</Label><Input type="number" step="0.01" value={f.unlimited_mileage_rate ?? ""} onChange={(e) => setF({ ...f, unlimited_mileage_rate: e.target.value })} placeholder="Blank = not offered" /></div>
      </div>
      {agreementFieldsMissing.length > 0 && (
        <div className="border border-destructive/50 bg-destructive/10 p-3 text-sm">
          <p className="font-semibold">Complete these agreement details before approving a long-term booking:</p>
          <p className="mt-1 text-muted-foreground">{agreementFieldsMissing.map((field) => field.replace(/_/g, " ")).join(", ")}</p>
        </div>
      )}
      <div>
        <Label>Rental Options</Label>
        <div className="flex flex-wrap gap-3 mt-1">
          {RENTAL_OPTS.map((o) => (
            <label key={o} className="flex items-center gap-1 text-sm">
              <Checkbox checked={(f.rental_options || []).includes(o)}
                onCheckedChange={(v) => {
                  const cur = new Set(f.rental_options || []);
                  if (v) cur.add(o); else cur.delete(o);
                  setF({ ...f, rental_options: Array.from(cur) });
                }} />
               {o === "purchase" ? "Purchase" : o.replace("_", " ")}
            </label>
          ))}
        </div>
      </div>
      <div><Label>Description</Label><Textarea value={f.description || ""} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={f.is_active} onCheckedChange={(v) => setF({ ...f, is_active: !!v })} />
        Visible on public /rentals page
      </label>
      <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Vehicle"}</Button>

      <div className="border-t pt-3 space-y-2">
        <h4 className="font-semibold">Media (max 25 photos, 3 videos)</h4>
        {!currentId && <p className="text-xs text-muted-foreground">Save the vehicle first, then upload photos and videos.</p>}
        {currentId && (
          <>
            <div className="flex flex-wrap gap-2">
              {media.map((m) => {
                const isCover = m.media_type === "photo" && m.id === media.find((x) => x.media_type === "photo")?.id;
                return (
                <div key={m.id} className={`relative w-24 h-24 bg-muted rounded overflow-hidden ${isCover ? "ring-2 ring-primary" : ""}`}>
                  {m.media_type === "photo" ? (
                    <img src={m.url} className="w-full h-full object-cover" />
                  ) : (
                    <video src={m.url} className="w-full h-full object-cover" />
                  )}
                  <button onClick={() => removeMedia(m)} className="absolute top-1 right-1 bg-black/60 rounded-full p-1">
                    <Trash2 className="w-3 h-3 text-white" />
                  </button>
                  {m.media_type === "photo" && (
                    isCover ? (
                      <span className="absolute bottom-0 inset-x-0 text-[10px] text-center bg-primary text-primary-foreground py-0.5">Cover</span>
                    ) : (
                      <button onClick={() => setCover(m)} className="absolute bottom-0 inset-x-0 text-[10px] bg-black/70 text-white py-0.5">Set as cover</button>
                    )
                  )}
                </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-1 text-sm px-3 py-2 rounded border">
                  <Upload className="w-3 h-3" /> Add Photos
                </span>
                <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => uploadMedia(e.target.files, "photo")} />
              </label>
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-1 text-sm px-3 py-2 rounded border">
                  <Upload className="w-3 h-3" /> Add Videos
                </span>
                <input type="file" multiple accept="video/*" className="hidden" onChange={(e) => uploadMedia(e.target.files, "video")} />
              </label>
            </div>
          </>
        )}
      </div>
    </CardContent></Card>
  );
};

const BookingRow: React.FC<{ b: any; onChange: () => void }> = ({ b, onChange }) => {
  const openDoc = async (path: string) => {
    try {
      const res = await callAdmin("signBookingDoc", { path });
      if (res?.url) window.open(res.url, "_blank");
    } catch (e: any) {
      toast({ title: "Open failed", description: e.message, variant: "destructive" });
    }
  };

  const [verifying, setVerifying] = React.useState(false);
  const [returnOpen, setReturnOpen] = React.useState(false);

  const verifyPayment = async () => {
    setVerifying(true);
    try {
      const res = await callAdmin("verifyPaypalPayment", { id: b.id });
      if (res?.error) throw new Error(res.error);
      toast({ title: "Payment verified", description: "PayPal payment confirmed and commissions created." });
      onChange();
    } catch (e: any) {
      toast({ title: "Not verified", description: e.message, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const markManual = async (method: "cash" | "cashapp") => {
    const label = method === "cash" ? "cash" : "Cash App";
    const amount = prompt(`Amount of ${label} received (total due $${Number(b.total_price).toFixed(2)}):`, Number(b.total_price).toFixed(2));
    if (amount === null) return;
    let reference = "";
    if (method === "cashapp") {
      const r = prompt("Cash App payment ID or sender $cashtag (check $BestCarRentals activity, note should include booking code " + String(b.id).slice(0, 8).toUpperCase() + "):");
      if (r === null) return;
      reference = r;
    } else {
      const r = prompt("7-11 receipt/barcode reference or who confirmed the cash payment?");
      if (r === null) return;
      reference = r;
    }
    if (!confirm(`Confirm $${amount} received by ${label}? The car will show as rented and commissions will be created.`)) return;
    try {
      const r = await callAdmin("markPaidManual", { id: b.id, method, reference, amount: Number(amount) });
      if (r?.error) throw new Error(r.error);
      toast({
        title: "Marked paid",
        description: r?.emailed
          ? `Recorded ${label} payment. The receipt was emailed to the renter.`
          : `Recorded ${label} payment. ${r?.emailError || "Receipt email not sent"} — download and send it manually.`,
      });
      if (r?.receiptUrl) window.open(r.receiptUrl, "_blank", "noopener,noreferrer");
      onChange();
    } catch (e: any) {
      toast({ title: "Not marked paid", description: e.message, variant: "destructive" });
    }
  };

  const setStatus = async (status: string) => {
    try {
      await callAdmin("updateBookingStatus", { id: b.id, status });
      onChange();
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Card><CardContent className="p-4 space-y-2">
      <div className="flex justify-between">
        <div>
          <p className="font-semibold">
            {b.vehicles?.year} {b.vehicles?.make} {b.vehicles?.model} · {b.rental_type}
          </p>
          {(() => {
            const active = ["active", "in_progress", "picked_up", "confirmed"].includes(String(b.status || "").toLowerCase());
            if (!active || !b.end_date) return null;
            const l = lateFeeStatus(new Date(b.end_date).getTime(), Date.now(), Number(b.vehicles?.day_rate || 0), b.vehicles?.hour_rate);
            if (!l.isLate) return null;
            return (
              <p className="mt-1 inline-block rounded bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground">
                LATE · {l.hoursLate} hr past grace · {l.waived ? "fee waivable if extended today" : `fee due $${l.lateFee.toFixed(2)}`}
              </p>
            );
          })()}
          <p className="text-xs text-muted-foreground">
            Renter {b.renter_username || b.renter_user_id.slice(0, 8)} · Start {new Date(b.start_date).toLocaleString()} · Return{" "}
            {b.end_date ? new Date(b.end_date).toLocaleString() : "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            Email: {b.renter_email ? <a className="underline" href={`mailto:${b.renter_email}`}>{b.renter_email}</a> : "—"} · Phone:{" "}
            {b.renter_phone ? <a className="underline" href={`tel:${b.renter_phone}`}>{b.renter_phone}</a> : "—"}
          </p>
          <p className="text-xs">Total ${Number(b.total_price).toLocaleString()} · Status: <b>{b.status}</b>{b.payment_method ? <> · Method: <b>{b.payment_method === "cashapp" ? "Cash App" : b.payment_method === "cash" ? "Cash (7-11)" : "PayPal"}</b>{["pending", "approved"].includes(b.status) ? " (renter's choice)" : ""}</> : null}</p>
          {b.payment_reference && <p className="text-xs text-muted-foreground">Ref: {b.payment_reference}{b.amount_received ? ` · Received $${Number(b.amount_received).toLocaleString()}` : ""}</p>}
          <p className="text-xs text-muted-foreground">Booking code: {String(b.id).slice(0, 8).toUpperCase()}</p>
          {b.referrer_username && <p className="text-xs text-muted-foreground">Ref: {b.referrer_username} · Upline: {b.upline_referrer_username || "—"}</p>}
          <p className="text-xs italic">"{b.signature_text}"</p>
        </div>
        <div className="flex flex-col gap-1">
          {b.license_path && <Button size="sm" variant="outline" onClick={() => openDoc(b.license_path)}><ExternalLink className="w-3 h-3 mr-1" />License</Button>}
          {b.insurance_path && <Button size="sm" variant="outline" onClick={() => openDoc(b.insurance_path)}><ExternalLink className="w-3 h-3 mr-1" />Insurance</Button>}
          {b.payment_receipt_path && <Button size="sm" variant="outline" onClick={() => openDoc(b.payment_receipt_path)}><Download className="w-3 h-3 mr-1" />Receipt</Button>}
        </div>
      </div>
      {b.cancellation_status && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm space-y-2">
          <p className="font-semibold">
            Cancellation {b.cancellation_status === "requested" ? "requested — needs your approval" : b.cancellation_status}
            {b.cancel_requested_at ? ` · ${new Date(b.cancel_requested_at).toLocaleString()}` : ""}
          </p>
          <p>{b.cancellation_reason}</p>
          <p>Keep <b>${Number(b.cancellation_fee || 0).toFixed(2)}</b> · Refund <b>${Number(b.cancellation_refund || 0).toFixed(2)}</b></p>
          {b.cancellation_status === "requested" && (
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={async () => {
                try { const r = await callAdmin("reviewCancellation", { id: b.id, approve: true }); if (r?.error) throw new Error(r.error); toast({ title: "Cancellation approved", description: "Send the refund to the renter." }); onChange(); }
                catch (e: any) { toast({ title: "Update failed", description: e.message, variant: "destructive" }); }
              }}>Approve cancellation</Button>
              <Button size="sm" variant="outline" onClick={async () => {
                try { const r = await callAdmin("reviewCancellation", { id: b.id, approve: false }); if (r?.error) throw new Error(r.error); toast({ title: "Cancellation declined" }); onChange(); }
                catch (e: any) { toast({ title: "Update failed", description: e.message, variant: "destructive" }); }
              }}>Decline</Button>
            </div>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {b.status === "pending" && <>
          <Button size="sm" onClick={() => setStatus("approved")}>Approve</Button>
          <Button size="sm" variant="destructive" onClick={() => setStatus("rejected")}>Reject</Button>
        </>}
        {["pending", "approved"].includes(b.status) && (
          <Button size="sm" onClick={verifyPayment} disabled={verifying}>
            {verifying ? "Verifying PayPal..." : "Mark Paid (verify PayPal payment)"}
          </Button>
        )}
        {["pending", "approved"].includes(b.status) && <Button size="sm" variant="outline" onClick={() => markManual("cash")}>Mark Paid – Cash (7-11)</Button>}
        {["pending", "approved"].includes(b.status) && <Button size="sm" variant="outline" onClick={() => markManual("cashapp")}>Mark Paid – Cash App</Button>}
        {b.status === "paid" && <Button size="sm" onClick={() => setStatus("active")}>Mark Active (picked up)</Button>}
        {b.status === "active" && <Button size="sm" onClick={() => setStatus("completed")}>Mark Completed</Button>}
        {["paid", "active"].includes(b.status) && <Button size="sm" variant="secondary" onClick={() => setReturnOpen(true)}>Mark Returned</Button>}
        {returnOpen && <MarkReturnedDialog booking={b} open={returnOpen} onOpenChange={setReturnOpen} onSubmit={async (payload) => {
          try { const r = await callAdmin("markReturned", { id: b.id, ...payload }); if (r?.error) throw new Error(r.error); toast({ title: "Vehicle returned", description: "Booking completed; car is available again." }); onChange(); }
          catch (e: any) { toast({ title: "Update failed", description: e.message, variant: "destructive" }); throw e; }
        }} />}
        {b.returned_at && <span className="text-xs text-muted-foreground self-center">
          Returned {new Date(b.returned_at).toLocaleString()}
          {b.return_mileage != null ? ` · ${Number(b.return_mileage).toLocaleString()} mi` : ""}
          {b.return_fuel ? ` · Fuel ${b.return_fuel}` : ""}
          {Number(b.late_fee_charged) > 0 ? ` · Late fee $${Number(b.late_fee_charged).toFixed(2)}` : ""}
          {` · Deposit kept $${Number(b.deposit_kept || 0).toFixed(2)} / refunded $${Number(b.deposit_refunded || 0).toFixed(2)}`}
          {b.return_damage_notes ? ` · Damage: ${b.return_damage_notes}` : ""}
        </span>}
        {(b.return_photo_paths || []).map((p: string, i: number) => <Button key={p} size="sm" variant="outline" onClick={() => openDoc(p)}>Damage photo {i + 1}</Button>)}
        {["pending", "approved", "paid", "active"].includes(b.status) && <Button size="sm" variant="ghost" onClick={() => setStatus("cancelled")}>Cancel</Button>}
      </div>
    </CardContent></Card>
  );
};

export default AdminRentalsTab;
