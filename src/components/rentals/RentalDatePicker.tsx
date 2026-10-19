import { format } from "date-fns";
import { CalendarIcon, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toLocalDateTimeValue } from "@/lib/rentalTerms";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  fromDate: Date;
  toDate?: Date | undefined;
  disabled?: boolean;
};

const RentalDatePicker = ({ label, value, onChange, fromDate, toDate, disabled }: Props) => {
  const selected = value ? new Date(value) : undefined;
  const time = value ? value.slice(11, 16) : "10:00";

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn("h-11 w-full justify-start rounded-none text-left font-normal", !selected && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selected ? format(selected, "MMM d, yyyy") : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="rental-calendar w-auto max-w-[calc(100vw-2rem)] rounded-none border-rental-line bg-rental-surface p-0 text-rental-foreground shadow-2xl" align="start" collisionPadding={16}>
          <Calendar
            mode="single"
            selected={selected}
            {...(selected ? { defaultMonth: selected } : {})}
            onSelect={(date) => date && onChange(toLocalDateTimeValue(date, time))}
            disabled={[{ before: fromDate }, ...(toDate ? [{ after: toDate }] : [])]}
            className="pointer-events-auto p-4"
            classNames={{
              caption_label: "text-sm font-semibold uppercase tracking-[0.2em] text-rental-foreground",
              button_previous: "inline-flex h-8 w-8 items-center justify-center border border-rental-line text-rental-foreground transition-colors hover:border-rental-primary hover:text-rental-primary",
              button_next: "inline-flex h-8 w-8 items-center justify-center border border-rental-line text-rental-foreground transition-colors hover:border-rental-primary hover:text-rental-primary",
              weekday: "w-10 text-center text-[0.7rem] font-medium uppercase tracking-wider text-rental-muted",
              day_button: "inline-flex h-10 w-10 items-center justify-center font-normal text-rental-foreground transition-colors hover:bg-rental-primary/20 disabled:pointer-events-none",
              selected: "[&>button]:bg-rental-primary [&>button]:font-semibold [&>button]:text-rental-primary-foreground [&>button:hover]:bg-rental-primary",
              today: "[&>button]:text-rental-primary [&>button]:font-semibold",
              disabled: "opacity-25",
            }}
          />

        </PopoverContent>
      </Popover>
      <div className="relative">
        <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label={`${label} time`}
          type="time"
          value={time}
          disabled={disabled || !selected}
          onChange={(event) => selected && onChange(toLocalDateTimeValue(selected, event.target.value))}
          className="h-11 rounded-none pl-10"
        />
      </div>
    </div>
  );
};

export default RentalDatePicker;