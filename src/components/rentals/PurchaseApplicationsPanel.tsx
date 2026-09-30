import React, { useEffect, useState } from "react";
import { Download, Eye, FileText, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const STATUSES = ["new", "reviewing", "contacted", "approved", "declined", "closed"];
const show = (value: unknown) => value === null || value === undefined || value === "" ? "—" : String(value);
const money = (value: unknown) => `$${Number(value || 0).toLocaleString()}`;
const title = (value: string) => value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());

const DetailBlock = ({ heading, data }: { heading: string; data: Record<string, unknown> | null | undefined }) => {
  if (!data) return null;
  return <section className="border border-border p-4">
    <h3 className="mb-3 font-semibold text-foreground">{heading}</h3>
    <dl className="grid gap-x-5 gap-y-2 sm:grid-cols-2">
      {Object.entries(data).filter(([, value]) => value !== null && value !== undefined && value !== "" && typeof value !== "object").map(([key, value]) => <div key={key}>
        <dt className="text-xs text-muted-foreground">{title(key)}</dt>
        <dd className="break-words text-sm text-foreground">{show(value)}</dd>
      </div>)}
    </dl>
  </section>;
};

const downloadApplication = (row: any) => {
  const sections: Array<[string, Record<string, unknown> | null | undefined]> = [
    ["Applicant", row.applicant], ["Residence", row.residence], ["Employment", row.employment],
    ["Interested Vehicle", row.interested_vehicle], ["Trade-In", row.trade_in], ["Co-Buyer", row.co_buyer],
  ];
  const lines = ["BEST CAR RENTAL SERVICES", "CREDIT APPLICATION", `Application ID: ${row.id}`, `Received: ${new Date(row.submitted_at).toLocaleString()}`, `Status: ${row.status}`, ""];
  sections.forEach(([heading, data]) => {
    if (!data) return;
    lines.push(heading.toUpperCase());
    Object.entries(data).forEach(([key, value]) => {
      if (value && typeof value === "object") {
        lines.push(`  ${title(key)}:`);
        Object.entries(value as Record<string, unknown>).forEach(([nestedKey, nestedValue]) => lines.push(`    ${title(nestedKey)}: ${show(nestedValue)}`));
      } else lines.push(`  ${title(key)}: ${show(value)}`);
    });
    lines.push("");
  });
  lines.push("CONSENTS", `Credit authorization: ${row.credit_authorization_consent ? "Accepted" : "Not accepted"}`, `Privacy policy: ${row.privacy_policy_consent ? "Accepted" : "Not accepted"}`, `Marketing SMS: ${row.marketing_sms_consent ? "Yes" : "No"}`, `Service SMS: ${row.service_sms_consent ? "Yes" : "No"}`, "", "ADMIN NOTES", row.admin_notes || "None");
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
  anchor.href = url; anchor.download = `credit-application-${row.id}.txt`; anchor.click(); URL.revokeObjectURL(url);
};

const PurchaseApplicationsPanel: React.FC<{ callAdmin: (action: string, extra?: Record<string, any>) => Promise<any> }> = ({ callAdmin }) => {
  const [rows, setRows] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [selected, setSelected] = useState<any | null>(null); const [notes, setNotes] = useState(""); const [saving, setSaving] = useState(false);
  const load = async () => { setLoading(true); try { const result = await callAdmin("listPurchaseApplications"); setRows(result?.data || []); } catch (error: any) { toast({ title: "Applications unavailable", description: error.message, variant: "destructive" }); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const update = async (id: string, payload: Record<string, unknown>) => {
    try { await callAdmin("updatePurchaseApplication", { id, payload }); setRows((current) => current.map((row) => row.id === id ? { ...row, ...payload } : row)); setSelected((current: any) => current?.id === id ? { ...current, ...payload } : current); return true; }
    catch (error: any) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return false; }
  };
  const open = (row: any) => { setSelected(row); setNotes(row.admin_notes || ""); };
  const saveNotes = async () => { if (!selected) return; setSaving(true); const saved = await update(selected.id, { admin_notes: notes }); setSaving(false); if (saved) toast({ title: "Notes saved" }); };
  if (loading) return <p className="text-muted-foreground">Loading credit applications…</p>;
  if (!rows.length) return <div className="border border-dashed border-border py-14 text-center"><FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="text-muted-foreground">No credit applications yet.</p></div>;
  return <>
    <div className="mb-4"><h2 className="text-xl font-semibold">Credit Applications</h2><p className="text-sm text-muted-foreground">Select an application to review all details, add notes, or download a copy.</p></div>
    <div className="space-y-3">{rows.map((row) => { const buyer = row.applicant || {}; const wanted = row.interested_vehicle || {}; return <Card key={row.id}><CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
      <button type="button" onClick={() => open(row)} className="min-w-0 flex-1 text-left">
        <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{show(buyer.firstName)} {show(buyer.lastName)}</p><Badge variant="outline" className="capitalize">{row.status}</Badge></div>
        <p className="mt-1 text-sm text-muted-foreground">{show(buyer.email)} · {show(buyer.cellPhone)}</p>
        <p className="mt-1 text-xs text-muted-foreground">{show(wanted.year)} {show(wanted.make)} {show(wanted.model)} · Received {new Date(row.submitted_at).toLocaleDateString()}</p>
      </button>
      <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => open(row)}><Eye className="mr-2 h-4 w-4" /> View</Button><Button size="icon" variant="outline" title="Download application" onClick={() => downloadApplication(row)}><Download className="h-4 w-4" /><span className="sr-only">Download application</span></Button></div>
    </CardContent></Card>; })}</div>
    <Dialog open={!!selected} onOpenChange={(isOpen) => { if (!isOpen) setSelected(null); }}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        {selected && <><DialogHeader><DialogTitle>Credit Application</DialogTitle><DialogDescription>{show(selected.applicant?.firstName)} {show(selected.applicant?.lastName)} · Received {new Date(selected.submitted_at).toLocaleString()}</DialogDescription></DialogHeader>
          <div className="flex flex-col gap-3 border-y border-border py-4 sm:flex-row sm:items-center sm:justify-between"><Select value={selected.status} onValueChange={(status) => update(selected.id, { status })}><SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map((status) => <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>)}</SelectContent></Select><Button variant="outline" onClick={() => downloadApplication(selected)}><Download className="mr-2 h-4 w-4" /> Download Application</Button></div>
          <div className="grid gap-3 lg:grid-cols-2"><DetailBlock heading="Applicant" data={selected.applicant} /><DetailBlock heading="Residence" data={selected.residence} /><DetailBlock heading="Employment" data={selected.employment} /><DetailBlock heading="Interested Vehicle" data={selected.interested_vehicle} /><DetailBlock heading="Trade-In" data={selected.trade_in} /><DetailBlock heading="Co-Buyer" data={selected.co_buyer} /></div>
          <section className="flex flex-wrap items-center gap-3 border border-border p-4"><h3 className="font-semibold">Social Security</h3>{(["applicant", "coBuyer"] as const).map((who) => { const p = who === "applicant" ? selected.applicant : selected.co_buyer; if (!p?.hasSsn) return null; return <Button key={who} size="sm" variant="outline" onClick={async () => { try { const r = await callAdmin("revealPurchaseSsn", { id: selected.id, who }); toast({ title: `${who === "applicant" ? "Applicant" : "Co-buyer"} SSN`, description: r.ssn }); } catch (e: any) { toast({ title: "Unavailable", description: e.message, variant: "destructive" }); } }}><Eye className="mr-2 h-4 w-4" /> Reveal {who === "applicant" ? "applicant" : "co-buyer"} SSN (•••{p.ssnLast4})</Button>; })}{!selected.applicant?.hasSsn && !selected.co_buyer?.hasSsn && <span className="text-sm text-muted-foreground">None on file</span>}</section>
          <section className="border border-border p-4"><h3 className="mb-2 font-semibold">Consent & Source</h3><div className="grid gap-2 text-sm sm:grid-cols-2"><p>Credit authorization: {selected.credit_authorization_consent ? "Accepted" : "Not accepted"}</p><p>Privacy policy: {selected.privacy_policy_consent ? "Accepted" : "Not accepted"}</p><p>Marketing SMS: {selected.marketing_sms_consent ? "Yes" : "No"}</p><p>Service SMS: {selected.service_sms_consent ? "Yes" : "No"}</p><p>Referrer: {show(selected.referrer_username)}</p><p>Application ID: {selected.id}</p></div></section>
          <section className="space-y-2 border border-border p-4"><Label htmlFor="credit-app-notes">Admin notes</Label><Textarea id="credit-app-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} rows={5} placeholder="Add private review notes…" /><div className="flex justify-end"><Button onClick={saveNotes} disabled={saving}><Save className="mr-2 h-4 w-4" /> {saving ? "Saving…" : "Save Notes"}</Button></div></section>
        </>}
      </DialogContent>
    </Dialog>
  </>;
};

export default PurchaseApplicationsPanel;