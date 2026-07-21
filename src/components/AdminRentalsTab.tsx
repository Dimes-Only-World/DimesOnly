import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAdminUserId } from "@/lib/adminAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Trash2, Plus, Upload, ExternalLink } from "lucide-react";

const RENTAL_OPTS = ["daily", "weekly", "monthly", "long_term", "rent_to_own"];

async function callAdmin(action: string, extra: Record<string, any> = {}) {
  const adminUserId = getAdminUserId();
  if (!adminUserId) throw new Error("Admin session missing. Please re-login.");
  const { data, error } = await supabase.functions.invoke("rental-admin", {
    body: { action, adminUserId, ...extra },
  });
  if (error) throw error;
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

const AdminRentalsTab: React.FC = () => {
  const [tab, setTab] = useState("vehicles");
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);

  const loadAll = async () => {
    try {
      const [vs, bs, cs] = await Promise.all([
        callAdmin("listVehicles"),
        callAdmin("listBookings"),
        callAdmin("listCommissions"),
      ]);
      setVehicles(vs?.data || []);
      setBookings(bs?.data || []);
      setCommissions(cs?.data || []);
    } catch (e: any) {
      toast({ title: "Load failed", description: e.message, variant: "destructive" });
    }
  };

  useEffect(() => { loadAll(); }, []);

  return (
    <div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="packages">Themed Packages</TabsTrigger>
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
          {bookings.map((b) => (
            <BookingRow key={b.id} b={b} onChange={loadAll} />
          ))}
          {bookings.length === 0 && <p className="text-muted-foreground">No bookings yet.</p>}
        </TabsContent>

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
      </Tabs>
    </div>
  );
};

const VehicleForm: React.FC<{ initial: any | null; onClose: () => void; onSaved: (v: any) => void }> = ({ initial, onClose, onSaved }) => {
  const [f, setF] = useState<any>(initial || {
    year: new Date().getFullYear(), make: "", model: "", vin: "", license_plate: "",
    mileage: 0, description: "", vehicle_type: "", pickup_location: "",
    day_rate: 0, weekly_rate: 0, monthly_rate: 0, down_payment: 0,
    rental_options: ["daily"], availability_status: "available", is_active: true,
  });
  const [currentId, setCurrentId] = useState<string | null>(initial?.id || null);
  const [saving, setSaving] = useState(false);
  const [media, setMedia] = useState<any[]>([]);

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
        mileage: Number(f.mileage) || 0,
        day_rate: Number(f.day_rate) || null,
        weekly_rate: Number(f.weekly_rate) || null,
        monthly_rate: Number(f.monthly_rate) || null,
        down_payment: Number(f.down_payment) || null,
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
        <div><Label>Mileage</Label><Input type="number" value={f.mileage || 0} onChange={(e) => setF({ ...f, mileage: e.target.value })} /></div>
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
        <div><Label>Day Rate ($)</Label><Input type="number" value={f.day_rate || 0} onChange={(e) => setF({ ...f, day_rate: e.target.value })} /></div>
        <div><Label>Weekly Rate ($)</Label><Input type="number" value={f.weekly_rate || 0} onChange={(e) => setF({ ...f, weekly_rate: e.target.value })} /></div>
        <div><Label>Monthly Rate ($)</Label><Input type="number" value={f.monthly_rate || 0} onChange={(e) => setF({ ...f, monthly_rate: e.target.value })} /></div>
        <div><Label>Down Payment ($)</Label><Input type="number" value={f.down_payment || 0} onChange={(e) => setF({ ...f, down_payment: e.target.value })} /></div>
      </div>
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
              {o.replace("_", " ")}
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
              {media.map((m) => (
                <div key={m.id} className="relative w-24 h-24 bg-muted rounded overflow-hidden">
                  {m.media_type === "photo" ? (
                    <img src={m.url} className="w-full h-full object-cover" />
                  ) : (
                    <video src={m.url} className="w-full h-full object-cover" />
                  )}
                  <button onClick={() => removeMedia(m)} className="absolute top-1 right-1 bg-black/60 rounded-full p-1">
                    <Trash2 className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
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
          <p className="text-xs text-muted-foreground">
            Renter {b.renter_user_id.slice(0, 8)} · Start {new Date(b.start_date).toLocaleString()}
          </p>
          <p className="text-xs">Total ${Number(b.total_price).toLocaleString()} · Status: <b>{b.status}</b></p>
          {b.referrer_username && <p className="text-xs text-muted-foreground">Ref: {b.referrer_username} · Upline: {b.upline_referrer_username || "—"}</p>}
          <p className="text-xs italic">"{b.signature_text}"</p>
        </div>
        <div className="flex flex-col gap-1">
          {b.license_path && <Button size="sm" variant="outline" onClick={() => openDoc(b.license_path)}><ExternalLink className="w-3 h-3 mr-1" />License</Button>}
          {b.insurance_path && <Button size="sm" variant="outline" onClick={() => openDoc(b.insurance_path)}><ExternalLink className="w-3 h-3 mr-1" />Insurance</Button>}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {b.status === "pending" && <>
          <Button size="sm" onClick={() => setStatus("approved")}>Approve</Button>
          <Button size="sm" variant="destructive" onClick={() => setStatus("rejected")}>Reject</Button>
        </>}
        {b.status === "approved" && <Button size="sm" onClick={() => setStatus("paid")}>Mark Paid (trigger commissions)</Button>}
        {b.status === "paid" && <Button size="sm" onClick={() => setStatus("active")}>Mark Active</Button>}
        {b.status === "active" && <Button size="sm" onClick={() => setStatus("completed")}>Mark Completed</Button>}
        {["pending", "approved", "paid", "active"].includes(b.status) && <Button size="sm" variant="ghost" onClick={() => setStatus("cancelled")}>Cancel</Button>}
      </div>
    </CardContent></Card>
  );
};

export default AdminRentalsTab;
