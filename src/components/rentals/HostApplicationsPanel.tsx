import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  callAdmin: (action: string, extra?: Record<string, any>) => Promise<any>;
}

const STATUSES = ["new", "approved", "disapproved", "active", "removed"];
const DEPOSIT = ["pending", "paid", "refunded", "forfeited"];

const HostApplicationsPanel: React.FC<Props> = ({ callAdmin }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await callAdmin("listHostApplications");
      setRows(res?.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDoc = async (path?: string) => {
    if (!path) return;
    const res = await callAdmin("signHostDoc", { path });
    if (res?.url) window.open(res.url, "_blank", "noopener");
  };

  const update = async (id: string, payload: Record<string, any>) => {
    await callAdmin("updateHostApplication", { id, payload });
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...payload } : x)));
  };

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (!rows.length) return <p className="text-muted-foreground">No host applications yet.</p>;

  return (
    <div className="space-y-3">
      {rows.map((a) => {
        const days = Math.floor((Date.now() - new Date(a.signed_at).getTime()) / 86400000);
        return (
          <Card key={a.id}>
            <CardContent className="space-y-2 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  {a.full_name} — {a.year} {a.make} {a.model}
                </p>
                <span className="text-xs text-muted-foreground">
                  Signed {new Date(a.signed_at).toLocaleString()} ({days} days ago)
                </span>
              </div>
              <p>
                {a.email} · {a.phone} · {a.address}, {a.city_state_zip}
              </p>
              <p>
                DL #{a.drivers_license_no} · VIN {a.vin} · Plate {a.license_plate || "—"} · Color {a.color || "—"} · Miles{" "}
                {a.mileage || "—"}
              </p>
              <p>
                Plan: <b>Earn {a.earnings_plan}%</b> · Payout: {a.payout_method || "—"} · Deposit ${a.deposit_amount}{" "}
                {days < 30 ? "(removal now forfeits deposit)" : "(eligible for refund)"}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => openDoc(a.drivers_license_path)}>Driver's License</Button>
                <Button size="sm" variant="outline" onClick={() => openDoc(a.registration_path)}>Registration</Button>
                <Button size="sm" variant="outline" onClick={() => openDoc(a.signature_path)}>Signed Agreement</Button>
                {a.vehicle_photo_path && <Button size="sm" variant="outline" onClick={() => openDoc(a.vehicle_photo_path)}>Vehicle Photo</Button>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${a.status === "approved" || a.status === "active" ? "bg-primary text-primary-foreground" : a.status === "disapproved" ? "bg-destructive text-destructive-foreground" : "bg-muted"}`}>{a.status}</span>
                <Button size="sm" onClick={() => update(a.id, { status: "approved" })}>Approve</Button>
                <Button size="sm" variant="destructive" onClick={() => update(a.id, { status: "disapproved" })}>Disapprove</Button>
                <label className="ml-2 flex items-center gap-1">Money made $
                  <input type="number" min="0" step="0.01" defaultValue={a.earnings_total ?? 0} className="w-24 rounded border bg-background px-2 py-1"
                    onBlur={(e) => { const v = Number(e.target.value) || 0; if (v !== Number(a.earnings_total || 0)) update(a.id, { earnings_total: v }); }} />
                </label>
              </div>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-1">
                  Status
                  <select className="rounded border bg-background px-2 py-1" value={a.status} onChange={(e) => update(a.id, { status: e.target.value })}>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-1">
                  Deposit
                  <select className="rounded border bg-background px-2 py-1" value={a.deposit_status} onChange={(e) => update(a.id, { deposit_status: e.target.value })}>
                    {DEPOSIT.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </label>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default HostApplicationsPanel;
