import sys

with open('src/pages/rentals/HostApplication.tsx', 'r') as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if 'const vErr = validateVehicle(vehicles[vIdx]);' in line:
        continue # Skip this redundant/broken line
    new_lines.append(line)

with open('src/pages/rentals/HostApplication.tsx', 'w') as f:
    f.writelines(new_lines)
