import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/** Shared calendar built on react-day-picker v9 class names. */
function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "relative flex flex-col gap-4 sm:flex-row",
        month: "flex w-full flex-col gap-4",
        month_caption: "flex h-9 items-center justify-center",
        caption_label: "text-sm font-semibold tracking-wide",
        nav: "absolute inset-x-0 top-0 z-10 flex h-9 items-center justify-between",
        button_previous: cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 w-8 bg-transparent p-0 opacity-80 hover:opacity-100"),
        button_next: cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 w-8 bg-transparent p-0 opacity-80 hover:opacity-100"),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-10 text-center text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground",
        week: "mt-1 flex w-full",
        day: "relative h-10 w-10 p-0 text-center text-sm",
        day_button: "inline-flex h-10 w-10 items-center justify-center rounded-md font-normal transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none",
        selected: "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:font-semibold [&>button:hover]:bg-primary",
        today: "[&>button]:ring-1 [&>button]:ring-primary/60",
        outside: "text-muted-foreground opacity-40",
        disabled: "text-muted-foreground opacity-30",
        range_middle: "[&>button]:rounded-none [&>button]:bg-accent",
        hidden: "invisible",
        dropdowns: "flex items-center gap-2",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => (orientation === "left" ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
