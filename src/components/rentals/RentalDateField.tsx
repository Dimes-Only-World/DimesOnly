import React, { useEffect, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { format, isValid, parse } from "date-fns";
import { CalendarDays } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** Branded date picker for rental forms. Value is ISO yyyy-MM-dd; users can type MM/DD/YYYY or pick from a calendar with month/year dropdowns. */
export default function RentalDateField({ value, onChange, fromYear = 1930, toYear = new Date().getFullYear() + 15, id }: { value: string; onChange: (v: string) => void; fromYear?: number; toYear?: number; id?: string }) {
  const selected = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;
  const [text, setText] = useState(selected && isValid(selected) ? format(selected, "MM/dd/yyyy") : "");
  const [open, setOpen] = useState(false);
  useEffect(() => { setText(selected && isValid(selected) ? format(selected, "MM/dd/yyyy") : ""); }, [value]);

  const onType = (raw: string) => {
    const d = raw.replace(/\D/g, "").slice(0, 8);
    const t = d.length > 4 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
    setText(t);
    if (d.length === 8) { const p = parse(t, "MM/dd/yyyy", new Date()); if (isValid(p)) onChange(format(p, "yyyy-MM-dd")); }
    else if (!d.length) onChange("");
  };

  return <div className="flex h-10 w-full items-center border border-rental-line bg-rental-surface focus-within:border-rental-primary">
    <input id={id} value={text} onChange={(e) => onType(e.target.value)} inputMode="numeric" placeholder="MM/DD/YYYY" className="h-full min-w-0 flex-1 bg-transparent px-3 text-base text-rental-foreground outline-none placeholder:text-rental-muted" />
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><button type="button" aria-label="Open calendar" className="flex h-full items-center px-3 text-rental-muted transition-colors hover:text-rental-primary"><CalendarDays className="h-5 w-5" /></button></PopoverTrigger>
      <PopoverContent align="end" className="rental-calendar w-auto rounded-none border-rental-line bg-rental-surface p-3 text-rental-foreground shadow-2xl">
        <DayPicker mode="single" captionLayout="dropdown" startMonth={new Date(fromYear, 0)} endMonth={new Date(toYear, 11)} selected={selected && isValid(selected) ? selected : undefined} defaultMonth={selected && isValid(selected) ? selected : undefined}
          onSelect={(d) => { if (d) { onChange(format(d, "yyyy-MM-dd")); setOpen(false); } }} className="pointer-events-auto" />
      </PopoverContent>
    </Popover>
  </div>;
}
