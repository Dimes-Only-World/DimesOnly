import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import RentalDatePicker from "@/components/rentals/RentalDatePicker";

export const Route = createFileRoute("/zzcaltest")({ component: T });

function T() {
  const [v, setV] = useState("");
  return <div className="rentals-showroom min-h-screen p-10"><div className="w-80"><RentalDatePicker label="Pickup" value={v} onChange={setV} fromDate={new Date()} /></div></div>;
}
