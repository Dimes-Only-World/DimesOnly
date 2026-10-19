import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { lateFeeStatus } from "@/lib/rentalExtensionRules";

const toLocalInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => { const s = String(r.result || ""); resolve(s.slice(s.indexOf(",") + 1)); };
    r.onerror = reject;
    r.readAsDataURL(file);
  });

interface Props {
  booking: any;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

const MarkReturnedDialog: React.FC<Props> = ({ booking: b, open, onOpenChange, onSubmit }) => {
  const deposit = Number(b.security_deposit || 0);
  const [returnedAt, setReturnedAt] = useState(() => toLocalInput(new Date()));
  const calcFee = () => {
    if (!b.end_date) return 0;
    const l = lateFeeStatus(new Date(b.end_date).getTime(), new Date(returnedAt).getTime(), Number(b.vehicles?.day_rate || 0), b.vehicles?.hour_rate);
    return l.isLate ? l.lateFee : 0;
  };
  const [lateFee, setLateFee] = useState(() => calcFee().toFixed(2));
  const [mileage, setMileage] = useState("");
  const [fuel, setFuel] = useState("Full");
  const [notes, setNotes] = useState("");
  const [kept, setKept] = useState(() => Math.min(deposit, calcFee()).toFixed(2));
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const keptNum = Math.max(0, Math.min(deposit, Number(kept) || 0));

  const save = async () => {
    setSaving(true);
    try {
      const photos = await Promise.all(files.map(async (f) => ({ contentType: f.type, base64: await fileToBase64(f) })));
      await onSubmit({ returnedAt: new Date(returnedAt).toISOString(), mileage, fuel, damageNotes: notes, lateFee: Number(lateFee) || 0, depositKept: keptNum, photos });
      onOpenChange(false);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Mark returned</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Return time</Label>
            <Input type="datetime-local" value={returnedAt} onChange={(e) => { setReturnedAt(e.target.value); }} />
            <button type="button" className="mt-1 text-xs underline" onClick={() => setLateFee(calcFee().toFixed(2))}>Recalculate late fee for this time</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Odometer</Label><Input inputMode="numeric" placeholder="24,676" value={mileage} onChange={(e) => setMileage(e.target.value)} /></div>
            <div><Label>Fuel</Label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm" value={fuel} onChange={(e) => setFuel(e.target.value)}>
                {["Full", "3/4", "1/2", "1/4", "Empty"].map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <div><Label>Damage notes</Label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="None" /></div>
          <div><Label>Damage photos (up to 10)</Label>
            <Input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 10))} />
            {files.length > 0 && <p className="mt-1 text-xs text-muted-foreground">{files.length} photo(s) chosen</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Late fee ($)</Label><Input inputMode="decimal" value={lateFee} onChange={(e) => setLateFee(e.target.value)} /></div>
            <div><Label>Deposit kept ($ of {deposit.toFixed(2)})</Label><Input inputMode="decimal" value={kept} onChange={(e) => setKept(e.target.value)} /></div>
          </div>
          <p className="text-sm">Deposit refunded: <b>${(deposit - keptNum).toFixed(2)}</b></p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save & mark completed"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MarkReturnedDialog;
