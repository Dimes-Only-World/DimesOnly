import sys

with open('src/pages/rentals/VehiclePurchaseApplication.tsx', 'r') as f:
    content = f.read()

# Fix index signature access for interestedVehicle
content = content.replace('interested.year', 'interested["year"]')
content = content.replace('interested.make', 'interested["make"]')
content = content.replace('interested.model', 'interested["model"]')

# Fix TS5076: '??' and '||' operations cannot be mixed without parentheses.
content = content.replace('values["firstName"] ?? ""', '(values["firstName"] ?? "")')
content = content.replace('values["lastName"] ?? ""', '(values["lastName"] ?? "")')
content = content.replace('values["email"] ?? ""', '(values["email"] ?? "")')
content = content.replace('values["cellPhone"] ?? ""', '(values["cellPhone"] ?? "")')
content = content.replace('values["homePhone"] ?? ""', '(values["homePhone"] ?? "")')
content = content.replace('values["dateOfBirth"] ?? ""', '(values["dateOfBirth"] ?? "")')
content = content.replace('values["driversLicenseNumber"] ?? ""', '(values["driversLicenseNumber"] ?? "")')
content = content.replace('values["driversLicenseState"] ?? ""', '(values["driversLicenseState"] ?? "")')
content = content.replace('values["driversLicenseIssueDate"] ?? ""', '(values["driversLicenseIssueDate"] ?? "")')
content = content.replace('values["driversLicenseExpiryDate"] ?? ""', '(values["driversLicenseExpiryDate"] ?? "")')
content = content.replace('values["streetAddress"] ?? ""', '(values["streetAddress"] ?? "")')
content = content.replace('values["city"] ?? ""', '(values["city"] ?? "")')
content = content.replace('values["state"] ?? ""', '(values["state"] ?? "")')
content = content.replace('values["zipCode"] ?? ""', '(values["zipCode"] ?? "")')
content = content.replace('values["housingType"] ?? ""', '(values["housingType"] ?? "")')
content = content.replace('values["monthlyPayment"] ?? ""', '(values["monthlyPayment"] ?? "")')
content = content.replace('values["previousAddress"] ?? ""', '(values["previousAddress"] ?? "")')
content = content.replace('values["employerName"] ?? ""', '(values["employerName"] ?? "")')
content = content.replace('values["title"] ?? ""', '(values["title"] ?? "")')
content = content.replace('values["employerPhone"] ?? ""', '(values["employerPhone"] ?? "")')
content = content.replace('values["monthlyGrossIncome"] ?? ""', '(values["monthlyGrossIncome"] ?? "")')
content = content.replace('values["yearsAtJob"] ?? ""', '(values["yearsAtJob"] ?? "")')
content = content.replace('values["monthsAtJob"] ?? ""', '(values["monthsAtJob"] ?? "")')
content = content.replace('values["previousEmployment"] ?? ""', '(values["previousEmployment"] ?? "")')

# Fix setValues type errors
content = content.replace('setValues((c) => ({ ...c, hasVin: v', 'setValues((c: Values) => ({ ...c, hasVin: v')
content = content.replace('setValues((current) => current.year === year ? current : ({ ...current, year, model: "" }))', 'setValues((current: Values) => current["year"] === year ? current : ({ ...current, year, model: "" }))')
content = content.replace('setValues((current) => current.make === make ? current : ({ ...current, make, model: "" }))', 'setValues((current: Values) => current["make"] === make ? current : ({ ...current, make, model: "" }))')

with open('src/pages/rentals/VehiclePurchaseApplication.tsx', 'w') as f:
    f.write(content)
