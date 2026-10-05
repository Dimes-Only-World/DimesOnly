// Minimal NACHA (ACH) PPD credit file generator for paying members by direct deposit.
export type NachaConfig = {
  companyName: string; // up to 16 chars
  companyId: string; // 10 chars, usually "1" + EIN
  originRouting: string; // your bank's 9-digit routing number
  originBankName: string; // up to 23 chars
};

export type NachaEntry = {
  name: string;
  routing: string; // 9 digits
  account: string;
  type: "checking" | "savings";
  amount: number; // dollars
  id: string; // member reference, up to 15 chars
};

const pad = (v: string | number, len: number, right = false, ch = " ") => {
  const s = String(v).slice(0, len);
  return right ? s.padStart(len, ch) : s.padEnd(len, ch);
};
const num = (v: string | number, len: number) => pad(String(v).replace(/\D/g, ""), len, true, "0");
const clean = (s: string) => s.toUpperCase().replace(/[^A-Z0-9 ]/g, "");

export const validRouting = (r: string) => {
  const d = r.replace(/\D/g, "");
  if (d.length !== 9) return false;
  const w = [3, 7, 1, 3, 7, 1, 3, 7, 1];
  return d.split("").reduce((s, c, i) => s + Number(c) * w[i], 0) % 10 === 0;
};

export function buildNacha(cfg: NachaConfig, entries: NachaEntry[], effective: Date, now = new Date()) {
  const yymmdd = (d: Date) => `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const hhmm = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  const odfi = cfg.originRouting.replace(/\D/g, "").slice(0, 8);
  const lines: string[] = [];
  lines.push(
    "101" + " " + num(cfg.originRouting, 9) + " " + num(cfg.originRouting, 9) + yymmdd(now) + hhmm + "A094101" +
      pad(clean(cfg.originBankName), 23) + pad(clean(cfg.companyName), 23) + pad("", 8),
  );
  lines.push(
    "5220" + pad(clean(cfg.companyName), 16) + pad("", 20) + pad(cfg.companyId, 10) + "PPD" + pad("PAYROLL", 10) +
      yymmdd(effective) + yymmdd(effective) + "   1" + odfi + num(1, 7),
  );
  let hash = 0;
  let total = 0;
  entries.forEach((e, i) => {
    const r = e.routing.replace(/\D/g, "");
    const cents = Math.round(e.amount * 100);
    hash += Number(r.slice(0, 8));
    total += cents;
    lines.push(
      "6" + (e.type === "savings" ? "32" : "22") + r.slice(0, 8) + r[8] + pad(e.account.replace(/\D/g, ""), 17) +
        num(cents, 10) + pad(clean(e.id), 15) + pad(clean(e.name), 22) + "  " + "0" + odfi + num(i + 1, 7),
    );
  });
  const hash10 = String(hash).slice(-10);
  lines.push("8220" + num(entries.length, 6) + num(hash10, 10) + num(0, 12) + num(total, 12) + pad(cfg.companyId, 10) + pad("", 19) + pad("", 6) + odfi + num(1, 7));
  const records = lines.length + 1;
  const blocks = Math.ceil(records / 10);
  lines.push("9" + num(1, 6) + num(blocks, 6) + num(entries.length, 8) + num(hash10, 10) + num(0, 12) + num(total, 12) + pad("", 39));
  while (lines.length % 10 !== 0) lines.push("9".repeat(94));
  return { text: lines.join("\n"), totalCents: total, count: entries.length };
}
