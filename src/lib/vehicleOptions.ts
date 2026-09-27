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