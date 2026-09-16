import React, { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Clock, Globe, PhoneCall } from "lucide-react";
import { PRIVACY_NOTICE_TEXT } from "./privacyNoticeText";

const TIME_SLOTS = [
  "9:00am", "9:30am", "10:00am", "10:30am", "11:00am", "11:30am",
  "12:00pm", "12:30pm", "1:00pm", "1:30pm", "2:00pm", "2:30pm",
  "3:00pm", "3:30pm", "4:00pm", "4:30pm", "5:00pm",
];
const TIMEZONE = "Pacific Time - US & Canada";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface ScheduleCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ScheduleCallDialog: React.FC<ScheduleCallDialogProps> = ({ open, onOpenChange }) => {
  const [step, setStep] = useState<"datetime" | "details" | "done">("datetime");
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const viewMonth = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    return d;
  }, [today, monthOffset]);

  const calendarCells = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
  }, [viewMonth]);

  const reset = () => {
    setStep("datetime");
    setMonthOffset(0);
    setSelectedDate(null);
    setSelectedTime(null);
    setName("");
    setEmail("");
    setPhone("");
    setVehicle("");
    setSubmitting(false);
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const formattedDate = selectedDate
    ? selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "";

  const submit = async () => {
    if (!selectedDate || !selectedTime) return;
    if (!name.trim() || !email.trim() || !phone.trim()) {
      toast({ title: "Missing details", description: "Name, email, and phone number are required.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const yyyy = selectedDate.getFullYear();
      const mm = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const dd = String(selectedDate.getDate()).padStart(2, "0");
      const { error } = await supabase.from("rental_call_requests").insert({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        vehicle: vehicle.trim() || null,
        scheduled_date: `${yyyy}-${mm}-${dd}`,
        scheduled_time: selectedTime,
        timezone: TIMEZONE,
      });
      if (error) throw error;
      setStep("done");
    } catch (e: any) {
      toast({ title: "Could not schedule", description: e.message || "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="rentals-showroom max-w-3xl border-rental-line bg-rental-surface font-barlow text-rental-foreground">
          <DialogHeader>
            <DialogTitle className="font-barlow text-xl text-rental-foreground">
              Schedule a call with our team member to find out more about Best
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-6 sm:grid-cols-[220px_1fr]">
            {/* Left summary panel */}
            <div className="border-b border-rental-line pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
              {step === "details" && (
                <button
                  onClick={() => setStep("datetime")}
                  className="mb-3 flex h-8 w-8 items-center justify-center rounded-full border border-rental-line text-rental-foreground hover:bg-rental-elevated"
                  aria-label="Back to date and time"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <p className="font-barlow text-sm text-rental-muted">Best</p>
              <p className="mt-1 font-barlow text-lg font-bold text-rental-foreground">List a Car Call</p>
              <div className="mt-3 space-y-2 text-sm text-rental-muted">
                <p className="flex items-center gap-2"><Clock className="h-4 w-4" /> 15 min</p>
                <p className="flex items-center gap-2"><PhoneCall className="h-4 w-4" /> Phone call</p>
                {selectedDate && selectedTime && (
                  <p className="flex items-center gap-2 text-rental-foreground">
                    <CalendarDays className="h-4 w-4" /> {selectedTime}, {formattedDate}
                  </p>
                )}
                <p className="flex items-center gap-2"><Globe className="h-4 w-4" /> {TIMEZONE}</p>
              </div>
            </div>

            {/* Right content */}
            <div>
              {step === "datetime" && (
                <div>
                  <p className="font-barlow text-base font-bold text-rental-foreground">Select a Date &amp; Time</p>
                  <div className="mt-4 grid gap-6 md:grid-cols-2">
                    <div>
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setMonthOffset((m) => Math.max(0, m - 1))}
                          disabled={monthOffset === 0}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-rental-foreground hover:bg-rental-elevated disabled:opacity-30"
                          aria-label="Previous month"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <p className="font-barlow text-sm font-semibold text-rental-foreground">
                          {viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                        </p>
                        <button
                          onClick={() => setMonthOffset((m) => m + 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-rental-foreground hover:bg-rental-elevated"
                          aria-label="Next month"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-2 grid grid-cols-7 gap-1 text-center">
                        {WEEKDAYS.map((d) => (
                          <span key={d} className="py-1 text-xs font-semibold text-rental-muted">{d}</span>
                        ))}
                        {calendarCells.map((date, i) => {
                          if (!date) return <span key={`e${i}`} />;
                          const isPast = date < today;
                          const isSelected = selectedDate?.toDateString() === date.toDateString();
                          return (
                            <button
                              key={date.toISOString()}
                              disabled={isPast}
                              onClick={() => { setSelectedDate(date); setSelectedTime(null); }}
                              className={`rounded-full py-1.5 text-sm transition-colors ${
                                isSelected
                                  ? "bg-rental-primary font-bold text-rental-primary-foreground"
                                  : isPast
                                    ? "text-rental-muted/40"
                                    : "text-rental-foreground hover:bg-rental-elevated"
                              }`}
                            >
                              {date.getDate()}
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-3 text-xs text-rental-muted">Time zone</p>
                      <p className="flex items-center gap-1 text-sm text-rental-foreground">
                        <Globe className="h-3.5 w-3.5" /> {TIMEZONE}
                      </p>
                    </div>

                    {selectedDate && (
                      <div>
                        <p className="font-barlow text-sm font-semibold text-rental-foreground">{formattedDate}</p>
                        <ScrollArea className="mt-3 h-64 pr-3">
                          <div className="space-y-2">
                            {TIME_SLOTS.map((t) => (
                              <div key={t} className="flex gap-2">
                                <button
                                  onClick={() => setSelectedTime(t)}
                                  className={`flex-1 rounded-none border px-3 py-2 text-sm font-semibold transition-colors ${
                                    selectedTime === t
                                      ? "border-rental-primary bg-rental-primary text-rental-primary-foreground"
                                      : "border-rental-line text-rental-foreground hover:border-rental-primary"
                                  }`}
                                >
                                  {t}
                                </button>
                                {selectedTime === t && (
                                  <Button
                                    onClick={() => setStep("details")}
                                    className="rounded-none bg-rental-primary font-barlow font-semibold text-rental-primary-foreground hover:bg-rental-primary/90"
                                  >
                                    Next
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {step === "details" && (
                <div>
                  <p className="font-barlow text-base font-bold text-rental-foreground">Enter Details</p>
                  <div className="mt-4 space-y-4">
                    <div>
                      <Label htmlFor="scc-name" className="text-rental-foreground">Name *</Label>
                      <Input id="scc-name" value={name} onChange={(e) => setName(e.target.value)}
                        className="mt-1 rounded-none border-rental-line bg-rental-background text-rental-foreground" />
                    </div>
                    <div>
                      <Label htmlFor="scc-email" className="text-rental-foreground">Email *</Label>
                      <Input id="scc-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        className="mt-1 rounded-none border-rental-line bg-rental-background text-rental-foreground" />
                    </div>
                    <div>
                      <Label htmlFor="scc-phone" className="text-rental-foreground">Phone number *</Label>
                      <Input id="scc-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1"
                        className="mt-1 rounded-none border-rental-line bg-rental-background text-rental-foreground" />
                    </div>
                    <div>
                      <Label htmlFor="scc-vehicle" className="text-rental-foreground">Add Vehicle Make, Model, and Year</Label>
                      <Input id="scc-vehicle" value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="e.g. Tesla Model Y 2024"
                        className="mt-1 rounded-none border-rental-line bg-rental-background text-rental-foreground" />
                    </div>
                    <p className="text-xs text-rental-muted">
                      By proceeding, you confirm that you have read and agree to our{" "}
                      <button type="button" onClick={() => setPrivacyOpen(true)} className="text-rental-primary underline">
                        Privacy Notice
                      </button>.
                    </p>
                    <Button
                      onClick={submit}
                      disabled={submitting}
                      className="rounded-none bg-rental-primary font-barlow font-semibold uppercase tracking-wide text-rental-primary-foreground hover:bg-rental-primary/90"
                    >
                      {submitting ? "Scheduling..." : "Schedule Event"}
                    </Button>
                  </div>
                </div>
              )}

              {step === "done" && (
                <div className="py-8 text-center">
                  <p className="font-barlow text-xl font-bold text-rental-foreground">You're scheduled!</p>
                  <p className="mt-2 text-sm text-rental-muted">
                    Your List a Car call is set for {selectedTime} on {formattedDate} ({TIMEZONE}). Our team will call you at the number you provided.
                  </p>
                  <Button
                    onClick={() => handleOpenChange(false)}
                    className="mt-6 rounded-none bg-rental-primary font-barlow font-semibold uppercase tracking-wide text-rental-primary-foreground hover:bg-rental-primary/90"
                  >
                    Done
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
        <DialogContent className="max-w-2xl border-rental-line bg-rental-surface font-barlow text-rental-foreground">
          <DialogHeader>
            <DialogTitle className="font-barlow text-lg text-rental-foreground">Privacy Notice</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-rental-muted">{PRIVACY_NOTICE_TEXT}</p>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ScheduleCallDialog;
