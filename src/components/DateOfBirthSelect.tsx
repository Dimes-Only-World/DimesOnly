import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const daysInMonth = (year: number, month: number) =>
  new Date(year, month, 0).getDate();

/** Returns age in whole years from an ISO yyyy-mm-dd string. */
export const calculateAge = (iso: string): number | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const today = new Date();
  let age = today.getFullYear() - y;
  const beforeBirthday =
    today.getMonth() + 1 < mo ||
    (today.getMonth() + 1 === mo && today.getDate() < d);
  if (beforeBirthday) age -= 1;
  return age;
};

interface Props {
  value: string; // yyyy-mm-dd
  onChange: (value: string) => void;
  error?: string;
}

const triggerClass =
  "bg-white/10 border-white/30 text-white focus:border-yellow-400 focus:ring-blue-400";

const DateOfBirthSelect: React.FC<Props> = ({ value, onChange, error }) => {
  // Local partial selection so year/month stay picked before the date is complete.
  const [parts, setParts] = React.useState<{ y: number; m: number; d: number }>(() => {
    const [y, m, d] = (value || "").split("-");
    return { y: Number(y) || 0, m: Number(m) || 0, d: Number(d) || 0 };
  });

  // Sync when parent value changes externally (e.g. reset).
  React.useEffect(() => {
    const [y, m, d] = (value || "").split("-");
    const next = { y: Number(y) || 0, m: Number(m) || 0, d: Number(d) || 0 };
    if (next.y && next.m && next.d) setParts(next);
    else if (!value) setParts((p) => (p.y || p.m || p.d ? p : { y: 0, m: 0, d: 0 }));
  }, [value]);

  const { y: yearNum, m: monthNum, d: dayNum } = parts;

  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear; y >= 1926; y--) years.push(y);

  const maxDay = yearNum && monthNum ? daysInMonth(yearNum, monthNum) : 31;
  const days: number[] = [];
  for (let d = 1; d <= maxDay; d++) days.push(d);

  const pad = (n: number) => String(n).padStart(2, "0");

  const emit = (y: number, m: number, d: number) => {
    const clampedDay = y && m && d ? Math.min(d, daysInMonth(y, m)) : d;
    setParts({ y, m, d: clampedDay });
    onChange(y && m && clampedDay ? `${y}-${pad(m)}-${pad(clampedDay)}` : "");
  };

  const age = calculateAge(value);
  const underage = age !== null && age < 18;


  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <Select
          value={yearNum ? String(yearNum) : undefined}
          onValueChange={(v) => emit(Number(v), monthNum, dayNum)}

        >
          <SelectTrigger className={triggerClass} aria-label="Birth year">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={monthNum ? String(monthNum) : undefined}
          onValueChange={(v) => emit(yearNum, Number(v), dayNum)}

          disabled={!yearNum}
        >
          <SelectTrigger className={triggerClass} aria-label="Birth month">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {MONTHS.map((name, i) => (
              <SelectItem key={name} value={String(i + 1)}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={dayNum ? String(dayNum) : undefined}
          onValueChange={(v) => emit(yearNum, monthNum, Number(v))}
          disabled={!yearNum || !monthNum}
        >
          <SelectTrigger className={triggerClass} aria-label="Birth day">
            <SelectValue placeholder="Day" />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {days.map((d) => (
              <SelectItem key={d} value={String(d)}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {underage && (
        <p className="text-red-400 text-sm">
          You must be at least 18 years old to register.
        </p>
      )}
      {!underage && error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
};

export default DateOfBirthSelect;
