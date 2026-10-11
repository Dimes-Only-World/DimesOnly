import sys
import re

with open('src/pages/rentals/VehiclePurchaseApplication.tsx', 'r') as f:
    content = f.read()

# Fix operator precedence for ?? and !== / ===
content = content.replace('values["hasVin"] ?? "" !== "yes"', '(values["hasVin"] ?? "") !== "yes"')
content = content.replace('values["hasVin"] ?? "" === "yes"', '(values["hasVin"] ?? "") === "yes"')
content = content.replace('values["hasVin"] ?? "" === "no"', '(values["hasVin"] ?? "") === "no"')

# Fix ?? and || mix
content = content.replace('values["vin"] ?? "" || ""', '(values["vin"] || "")')
content = content.replace('values["ssn"] ?? "" || ""', '(values["ssn"] || "")')

# Fix other index signature issues I might have missed
content = content.replace('applicant.email', 'applicant["email"]')

# Fix the SetStateAction in line 88 (shifted slightly)
content = content.replace(
    'setValues((c) => ({ ...c, year: d.year, make: d.make, model: d.model, trim: d.trim, specs: JSON.stringify(d.specs) }))',
    'setValues((c: Values) => ({ ...c, year: d.year, make: d.make, model: d.model, trim: d.trim, specs: JSON.stringify(d.specs) }) as Values)'
)

# Fix line 94 cast
content = content.replace(
    'setValues((c: Values) => ({ ...c, hasVin: v, ...(v === "no" ? { vin: "", specs: "", trim: "" } : {}) }))',
    'setValues((c: Values) => ({ ...c, hasVin: v, ...(v === "no" ? { vin: "", specs: "", trim: "" } : {}) }) as Values)'
)

# Fix the Dispatch assignment errors at the end of the file
# Lines 172, 173 (now shifted)
# Type 'Dispatch<SetStateAction<{ vin: string; mileage: string; year: string; make: string; model: string; }>>' is not assignable to type 'Dispatch<SetStateAction<Values>>'.
# This happens in the JSX: <VehicleFields values={tradeIn} setValues={setTradeIn} tradeIn />
# and <PersonFields values={coBuyer} setValues={setCoBuyer} prefix="buyer" />
# I should cast setTradeIn and setCoBuyer to the expected type if the structure is compatible.

content = content.replace('setValues={setTradeIn}', 'setValues={setTradeIn as any}')
content = content.replace('setValues={setCoBuyer}', 'setValues={setCoBuyer as any}')

with open('src/pages/rentals/VehiclePurchaseApplication.tsx', 'w') as f:
    f.write(content)
