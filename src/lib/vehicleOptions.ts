export const VEHICLE_MAKES = [
  "Acura", "Alfa Romeo", "Aston Martin", "Audi", "Bentley", "BMW", "Buick", "Cadillac", "Chevrolet", "Chrysler",
  "Dodge", "Ferrari", "Fiat", "Ford", "Genesis", "GMC", "Honda", "Hyundai", "Infiniti", "Jaguar", "Jeep", "Kia",
  "Lamborghini", "Land Rover", "Lexus", "Lincoln", "Lotus", "Lucid", "Maserati", "Mazda", "McLaren", "Mercedes-Benz",
  "MINI", "Mitsubishi", "Nissan", "Polestar", "Porsche", "Ram", "Rivian", "Rolls-Royce", "Subaru", "Tesla", "Toyota",
  "Volkswagen", "Volvo"
];

export const VEHICLE_YEARS = Array.from({ length: new Date().getFullYear() - 2009 }, (_, index) => String(new Date().getFullYear() - index));

export async function fetchVehicleModels(make: string, year: string): Promise<string[]> {
  if (!make || !year) return [];
  try {
    const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${encodeURIComponent(year)}?format=json`);
    if (!response.ok) return [];
    const body = await response.json();
    return [...new Set((body?.Results || []).map((row: any) => String(row.Model_Name || "").trim()).filter(Boolean))].sort() as string[];
  } catch {
    return [];
  }
}
export type DecodedVin = { year: string; make: string; model: string; trim: string; specs: Array<[string, string]> };

export async function decodeVin(vin: string): Promise<DecodedVin | null> {
  if (!/^[A-HJ-NPR-Z0-9]{17}$/i.test(vin)) return null;
  try {
    const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(vin)}?format=json`);
    if (!response.ok) return null;
    const r = (await response.json())?.Results?.[0];
    if (!r?.Make || !r?.ModelYear) return null;
    const makeRaw = String(r.Make).trim();
    const make = VEHICLE_MAKES.find((m) => m.toLowerCase() === makeRaw.toLowerCase()) || makeRaw.replace(/\w\S*/g, (w) => w[0] + w.slice(1).toLowerCase());
    const engine = [r.DisplacementL && `${Number(r.DisplacementL).toFixed(1)}L`, r.EngineCylinders && `${r.EngineCylinders}-cylinder`, r.EngineConfiguration].filter(Boolean).join(" ");
    const specs: Array<[string, string]> = [
      ["Trim", [r.Trim, r.Series].filter(Boolean).join(" ")], ["Body Style", r.BodyClass], ["Doors", r.Doors], ["Drivetrain", r.DriveType],
      ["Engine", engine], ["Horsepower", r.EngineHP ? `${Math.round(Number(r.EngineHP))} hp` : ""], ["Fuel", r.FuelTypePrimary],
      ["Transmission", [r.TransmissionStyle, r.TransmissionSpeeds && `${r.TransmissionSpeeds}-speed`].filter(Boolean).join(" ")], ["Seats", r.Seats],
      ["Built In", [r.PlantCity, r.PlantCountry].filter(Boolean).join(", ")],
    ].filter(([, v]) => v && String(v).trim()) as Array<[string, string]>;
    return { year: String(r.ModelYear), make, model: String(r.Model || "").trim(), trim: [r.Trim, r.Series].filter(Boolean).join(" "), specs };
  } catch { return null; }
}

export function vehicleStockPhoto(make: string, model: string, year: string, color = "") {
  if (!make || !model) return "";
  const family = model.toLowerCase().split(/[\s-]/)[0];
  const params = new URLSearchParams({ customer: "img", make: make.toLowerCase(), modelFamily: family, modelYear: year, angle: "01", zoomType: "fullscreen" });
  if (color) params.set("paintDescription", color);
  return `https://cdn.imagin.studio/getimage?${params.toString()}`;
}
