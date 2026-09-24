import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  callAdmin: (action: string, extra?: Record<string, any>) => Promise<any>;
}

const STATUSES = ["new", "approved", "active", "removed", "rejected"];
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
                <Button size="sm" variant="outline" onClick={() => openDoc(a.signature_path)}>Signature</Button>
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
