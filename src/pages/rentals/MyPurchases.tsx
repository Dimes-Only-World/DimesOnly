import React, { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "@/lib/router-compat";
import { ArrowLeft, CheckCircle2, Clock, Download, FileText, Loader2, ShieldCheck, Upload, XCircle, Car } from "lucide-react";
import BestLogoBanner from "@/components/rentals/BestLogoBanner";
import AccountMenu from "@/components/rentals/AccountMenu";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import PurchaseDocPicker, { type PendingDocs } from "@/components/rentals/PurchaseDocPicker";
import { listMyPurchases, signMyPurchaseDoc, uploadPurchaseDoc, type PurchaseDocType } from "@/lib/purchaseDocs";
import { buildAuthUrl } from "@/lib/refCapture";

const STATUS_STYLE: Record<string, { icon: React.ReactNode; cls: string; text: string }> = {
  Pending: { icon: <Clock className="h-4 w-4" />, cls: "border-rental-foreground/40 text-rental-foreground", text: "Our finance team is reviewing your application." },
  Approved: { icon: <CheckCircle2 className="h-4 w-4" />, cls: "border-rental-success text-rental-success", text: "Congratulations — your application is approved. A representative will contact you to finish your purchase." },
  Denied: { icon: <XCircle className="h-4 w-4" />, cls: "border-rental-primary text-rental-primary", text: "We were unable to approve this application. Contact us with any questions." },
  Closed: { icon: <FileText className="h-4 w-4" />, cls: "border-rental-line text-rental-muted", text: "This application is closed." },
};
const vName = (v: any) => [v?.year, v?.make, v?.model].filter(Boolean).join(" ") || "Vehicle";
const Row = ({ k, v }: { k: string; v: unknown }) => v === undefined || v === null || v === "" ? null : <div><dt className="text-xs text-rental-muted">{k}</dt><dd className="text-sm text-rental-foreground">{String(v)}</dd></div>;

const DocUploadBox: React.FC<{ app: any; onDone: () => void }> = ({ app, onDone }) => {
  const [docs, setDocs] = useState<PendingDocs>({}); const [busy, setBusy] = useState(false); const [note, setNote] = useState("");
  const count = Object.values(docs).reduce((n, f) => n + (f?.length || 0), 0);
  const send = async () => {
    const all = Object.entries(docs).flatMap(([t, files]) => (files || []).map((f) => [t, f] as const)); let failed = 0; setBusy(true);
    for (const [i, [t, f]] of all.entries()) { setNote(`Uploading ${i + 1} of ${all.length}…`); try { await uploadPurchaseDoc(app.id, t as PurchaseDocType, f); } catch (e: any) { failed++; toast({ title: `${f.name} not uploaded`, description: e.message, variant: "destructive" }); } }
    setBusy(false); setNote(""); setDocs({}); if (failed < all.length) toast({ title: "Documents uploaded", description: `${all.length - failed} file(s) sent to our finance team.` }); onDone();
  };
  return <section className="border border-rental-primary/60 bg-rental-surface/90 p-5 sm:p-6">
    <div className="mb-4 flex items-center gap-2"><Upload className="h-5 w-5 text-rental-primary" /><h2 className="rentals-wordmark text-2xl">UPLOAD DOCUMENTATION</h2></div>
    <p className="mb-4 text-sm text-rental-muted">Upload now or later: <strong className="text-rental-foreground">pay stubs for the last 3 months</strong> and <strong className="text-rental-foreground">proof of residence from the last 30 days</strong>, plus any other items requested below.</p>
    <PurchaseDocPicker value={docs} onChange={setDocs} busy={busy} />
    <div className="mt-4 flex items-center justify-end gap-3">{note && <span className="text-sm text-rental-muted">{note}</span>}<Button type="button" disabled={!count || busy} onClick={send} className="rounded-none bg-rental-primary font-semibold text-rental-primary-foreground">{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Upload {count ? `${count} file${count > 1 ? "s" : ""}` : "files"}</Button></div>
  </section>;
};

const MyPurchases: React.FC = () => {
  const [params] = useSearchParams(); const newId = params.get("new"); const failed = Number(params.get("failed") || 0);
  const [apps, setApps] = useState<any[] | null>(null); const [selected, setSelected] = useState<string | null>(newId);
  const load = useCallback(async () => { try { const list = await listMyPurchases(); setApps(list); setSelected((cur) => cur && list.some((a) => a.id === cur) ? cur : list[0]?.id || null); } catch (e: any) { setApps([]); toast({ title: "Could not load purchases", description: e.message, variant: "destructive" }); } }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (failed) toast({ title: "Some documents did not upload", description: `${failed} file(s) failed. Please upload them again below.`, variant: "destructive" }); }, [failed]);
  const app = apps?.find((a) => a.id === selected);
  const open = async (docId: string) => { try { window.open(await signMyPurchaseDoc(app.id, docId), "_blank", "noopener"); } catch (e: any) { toast({ title: "Unavailable", description: e.message, variant: "destructive" }); } };
  return <div className="rentals-showroom flex min-h-screen flex-col bg-rental-background text-rental-foreground">
    <BestLogoBanner />
    <AccountMenu />
    <main className="mobile-wall mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-8">
      <p className="text-xs font-semibold uppercase text-rental-primary">Best Car Rental Services</p>
      <h1 className="rentals-wordmark text-5xl leading-none sm:text-6xl">MY PURCHASES</h1>
      {newId && <div className="mt-5 flex items-start gap-3 border border-rental-success/60 bg-rental-surface/80 p-4"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-rental-success" /><div><p className="font-semibold">Application received</p><p className="text-sm text-rental-muted">One of our representatives will be in contact with you shortly. Upload any remaining documents below to speed up your approval.</p></div></div>}
      {apps === null ? <div className="py-20 text-center text-rental-muted"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>
        : !apps.length ? <div className="mt-8 border border-dashed border-rental-line p-10 text-center"><Car className="mx-auto mb-3 h-8 w-8 text-rental-muted" /><p className="text-rental-muted">No purchase applications found on this device or account.</p><div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row"><Button asChild className="rounded-none bg-rental-primary text-rental-primary-foreground"><Link to="/rentals/purchase">Start an application</Link></Button><Button asChild variant="outline" className="rounded-none"><a href={buildAuthUrl("/login", "/account/my-purchases")}>Log in</a></Button></div></div>
        : <div className="mt-8 space-y-6">
          {apps.length > 1 && <div className="flex flex-wrap gap-2">{apps.map((a) => <button key={a.id} type="button" onClick={() => setSelected(a.id)} className={`border px-3 py-2 text-sm ${a.id === selected ? "border-rental-primary bg-rental-primary text-rental-primary-foreground" : "border-rental-line bg-rental-surface"}`}>{vName(a.vehicle)} · {new Date(a.submitted_at).toLocaleDateString()}</button>)}</div>}
          {app && <>
            <DocUploadBox app={app} onDone={load} />
            <section className="border border-rental-line bg-rental-surface/80 p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs uppercase text-rental-muted">Application status</p><h2 className="rentals-wordmark text-3xl">{vName(app.vehicle)}</h2></div><span className={`inline-flex items-center gap-2 border px-3 py-1.5 text-sm font-semibold uppercase ${(STATUS_STYLE[app.status] || STATUS_STYLE["Pending"]!).cls}`}>{(STATUS_STYLE[app.status] || STATUS_STYLE["Pending"]!).icon}{app.status}</span></div>
              <p className="mt-3 text-sm text-rental-muted">{(STATUS_STYLE[app.status] || STATUS_STYLE["Pending"]!).text}</p>
              {app.sold && <div className="mt-4 flex items-center gap-3 border border-rental-success/60 p-4"><Car className="h-6 w-6 text-rental-success" /><div><p className="font-semibold">Vehicle purchased: {vName(app.vehicle)}</p>{app.sold_at && <p className="text-sm text-rental-muted">Completed {new Date(app.sold_at).toLocaleDateString()}</p>}</div></div>}
            </section>
            <section className="border border-rental-line bg-rental-surface/80 p-5 sm:p-6"><h3 className="mb-2 font-semibold uppercase tracking-wide text-rental-primary">What we need from you</h3>{app.requested_items ? <p className="whitespace-pre-wrap text-sm text-rental-foreground">{app.requested_items}</p> : <p className="text-sm text-rental-muted">Nothing extra right now. We'll post any requests here.</p>}</section>
            <section className="border border-rental-line bg-rental-surface/80 p-5 sm:p-6"><h3 className="mb-3 font-semibold uppercase tracking-wide text-rental-primary">Your documents</h3>{app.documents?.length ? <ul className="divide-y divide-rental-line">{app.documents.map((d: any) => <li key={d.id} className="flex items-center justify-between gap-3 py-2.5"><div className="min-w-0"><p className="truncate text-sm">{d.name}</p><p className="text-xs text-rental-muted">{d.label} · {new Date(d.uploaded_at).toLocaleDateString()}</p></div><Button size="sm" variant="outline" className="rounded-none" onClick={() => open(d.id)}><Download className="mr-1.5 h-4 w-4" /> View</Button></li>)}</ul> : <p className="text-sm text-rental-muted">No documents uploaded yet.</p>}</section>
            <section className="border border-rental-line bg-rental-surface/80 p-5 sm:p-6"><h3 className="mb-3 font-semibold uppercase tracking-wide text-rental-primary">Application details</h3><dl className="grid gap-3 sm:grid-cols-3"><Row k="Applicant" v={`${app.applicant?.firstName || ""} ${app.applicant?.lastName || ""}`.trim()} /><Row k="Email" v={app.applicant?.email} /><Row k="Phone" v={app.applicant?.cellPhone} /><Row k="SSN" v={app.applicant?.ssnLast4 ? `•••-••-${app.applicant.ssnLast4}` : null} /><Row k="Submitted" v={new Date(app.submitted_at).toLocaleString()} /><Row k="Co-buyer" v={app.has_co_buyer ? "Yes" : "No"} /><Row k="Vehicle VIN" v={app.interested_vehicle?.vin} /><Row k="Vehicle price" v={app.interested_vehicle?.vehiclePrice ? `$${Number(app.interested_vehicle.vehiclePrice).toLocaleString()}` : null} /><Row k="Down payment" v={app.interested_vehicle?.downPayment ? `$${Number(app.interested_vehicle.downPayment).toLocaleString()}` : null} /><Row k="Trade-in" v={app.trade_in ? vName(app.trade_in) + (app.trade_in.secondVehicle ? ` + ${vName(app.trade_in.secondVehicle)}` : "") : "None"} /></dl><p className="mt-4 flex items-center gap-2 text-xs text-rental-muted"><ShieldCheck className="h-4 w-4" /> Sensitive details are encrypted and hidden.</p></section>
          </>}
        </div>}
      <div className="flex justify-center px-4 pb-10">
        <Link to="/rentals" className="inline-flex items-center gap-2 bg-rental-primary px-6 py-3 font-semibold text-rental-background"><ArrowLeft className="h-4 w-4" /> Back to Rentals</Link>
      </div>
    </main>
  </div>;
};
export default MyPurchases;
