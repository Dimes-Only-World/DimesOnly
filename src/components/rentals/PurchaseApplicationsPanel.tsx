import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUSES = ["new", "reviewing", "contacted", "approved", "declined", "closed"];
const show = (value: unknown) => value === null || value === undefined || value === "" ? "—" : String(value);

const PurchaseApplicationsPanel: React.FC<{ callAdmin: (action: string, extra?: Record<string, any>) => Promise<any> }> = ({ callAdmin }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try { const result = await callAdmin("listPurchaseApplications"); setRows(result?.data || []); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const update = async (id: string, payload: Record<string, unknown>) => {
    await callAdmin("updatePurchaseApplication", { id, payload });
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...payload } : row));
  };
  if (loading) return <p className="text-muted-foreground">Loading applications…</p>;
  if (!rows.length) return <p className="text-muted-foreground">No purchase applications yet.</p>;
  return <div className="space-y-3">{rows.map((row) => {
    const buyer = row.applicant || {}; const home = row.residence || {}; const job = row.employment || {};
    const wanted = row.interested_vehicle || {}; const trade = row.trade_in; const co = row.co_buyer;
    return <Card key={row.id}><CardContent className="space-y-4 p-4 text-sm">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div><p className="font-semibold text-base">{show(buyer.firstName)} {show(buyer.lastName)}</p><p className="text-muted-foreground">Received {new Date(row.submitted_at).toLocaleString()}</p></div>
        <Select value={row.status} onValueChange={(status) => update(row.id, { status })}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map((status) => <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>)}</SelectContent></Select>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <section><h4 className="font-semibold">Buyer</h4><p>{show(buyer.email)} · {show(buyer.cellPhone)}</p><p>DOB {show(buyer.dateOfBirth)} · DL {show(buyer.driversLicenseNumber)} {show(buyer.driversLicenseState)}</p></section>
        <section><h4 className="font-semibold">Residence</h4><p>{show(home.streetAddress)}, {show(home.city)}, {show(home.state)} {show(home.zipCode)}</p><p>{show(home.housingType)} · ${Number(home.monthlyPayment || 0).toLocaleString()}/month</p></section>
        <section><h4 className="font-semibold">Employment</h4><p>{show(job.employerName)} · {show(job.title)}</p><p>{show(job.employerPhone)} · ${Number(job.monthlyGrossIncome || 0).toLocaleString()}/month · {show(job.yearsAtJob)}y {show(job.monthsAtJob)}m</p></section>
        <section><h4 className="font-semibold">Interested vehicle</h4><p>{show(wanted.year)} {show(wanted.make)} {show(wanted.model)}</p><p>VIN {show(wanted.vin)} · Price ${Number(wanted.vehiclePrice || 0).toLocaleString()} · Down ${Number(wanted.downPayment || 0).toLocaleString()}</p></section>
        {trade && <section><h4 className="font-semibold">Trade-in</h4><p>{show(trade.year)} {show(trade.make)} {show(trade.model)}</p><p>VIN {show(trade.vin)} · {Number(trade.mileage || 0).toLocaleString()} miles</p></section>}
        {co && <section><h4 className="font-semibold">Co-buyer</h4><p>{show(co.firstName)} {show(co.lastName)} · {show(co.relationship)}</p><p>{show(co.email)} · {show(co.cellPhone)}</p></section>}
      </div>
      <div><Label htmlFor={`purchase-notes-${row.id}`}>Admin notes</Label><Textarea id={`purchase-notes-${row.id}`} defaultValue={row.admin_notes || ""} onBlur={(event) => { if (event.target.value !== (row.admin_notes || "")) update(row.id, { admin_notes: event.target.value }); }} maxLength={2000} /></div>
    </CardContent></Card>;
  })}</div>;
};

export default PurchaseApplicationsPanel;