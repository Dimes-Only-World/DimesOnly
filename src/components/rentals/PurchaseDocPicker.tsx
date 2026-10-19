import React, { useRef } from "react";
import { FileUp, X } from "lucide-react";
import { DOC_ACCEPT, PURCHASE_DOC_TYPES, type PurchaseDocType } from "@/lib/purchaseDocs";

export type PendingDocs = Partial<Record<PurchaseDocType, File[]>>;

/** Lets the applicant pick files per document type; files are uploaded by the parent. */
const PurchaseDocPicker: React.FC<{ value: PendingDocs; onChange: (next: PendingDocs) => void; types?: PurchaseDocType[]; busy?: boolean }> = ({ value, onChange, types, busy }) => {
  const refs = useRef<Record<string, HTMLInputElement | null>>({});
  const list = PURCHASE_DOC_TYPES.filter((d) => !types || types.includes(d.type));
  return <div className="grid gap-3 sm:grid-cols-2">
    {list.map((d) => { const files = value[d.type] || []; return <div key={d.type} className="border border-rental-line bg-rental-surface/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div><p className="font-semibold text-rental-foreground">{d.label}</p><p className="text-xs text-rental-muted">{d.hint}</p></div>
        <button type="button" disabled={busy} onClick={() => refs.current[d.type]?.click()} className="inline-flex shrink-0 items-center gap-1.5 bg-rental-primary px-3 py-2 text-xs font-semibold uppercase text-rental-primary-foreground hover:bg-rental-primary/90 disabled:opacity-50"><FileUp className="h-3.5 w-3.5" /> {files.length ? "Add more" : "Choose file"}</button>
        <input ref={(el) => { refs.current[d.type] = el; }} type="file" multiple accept={DOC_ACCEPT} className="hidden" onChange={(e) => { const picked = Array.from(e.target.files || []); if (picked.length) onChange({ ...value, [d.type]: [...files, ...picked].slice(0, 10) }); e.target.value = ""; }} />
      </div>
      {files.length > 0 && <ul className="mt-3 space-y-1.5">{files.map((f, i) => <li key={i} className="flex items-center justify-between gap-2 text-sm text-rental-foreground"><span className="min-w-0 truncate">✓ {f.name}</span><button type="button" disabled={busy} aria-label={`Remove ${f.name}`} onClick={() => onChange({ ...value, [d.type]: files.filter((_, k) => k !== i) })} className="text-rental-muted hover:text-rental-primary"><X className="h-4 w-4" /></button></li>)}</ul>}
    </div>; })}
    <p className="text-xs text-rental-muted sm:col-span-2">PDF, JPG, PNG or HEIC, up to 10 MB each. Files are stored privately and only seen by our finance team.</p>
  </div>;
};
export default PurchaseDocPicker;
