import sys

with open('src/pages/rentals/HostApplication.tsx', 'r') as f:
    lines = f.readlines()

# Find the first and second submit
submit1_start = -1
submit2_start = -1
for i, line in enumerate(lines):
    if 'const submit = async (e: React.FormEvent) => {' in line:
        if submit1_start == -1:
            submit1_start = i
        else:
            submit2_start = i
            break

if submit1_start != -1 and submit2_start != -1:
    # Remove lines from submit1_start until just before submit2_start
    # But first, we need to find where submit1 ends. It ends at line 236.
    # We will replace that whole block with our new functions.
    
    new_funcs = [
        '  const nextVehicle = () => {\n',
        '    const current = vehicles[vIdx];\n',
        '    if (!current) return;\n',
        '    const vErr = validateVehicle(current);\n',
        '    if (vErr) {\n',
        '      toast({ title: vErr, variant: "destructive" });\n',
        '      return;\n',
        '    }\n',
        '    setVIdx((prev) => prev + 1);\n',
        '    window.scrollTo({ top: 0, behavior: "smooth" });\n',
        '  };\n',
        '\n',
        '  const startDepositPayment = async (ids: string[]) => {\n',
        '    const baseUrl = `${window.location.origin}${window.location.pathname}`;\n',
        '    const { data, error } = await supabase.functions.invoke("host-deposit-payment", {\n',
        '      body: {\n',
        '        action: "create",\n',
        '        applicationIds: ids,\n',
        '        returnUrl: `${baseUrl}?deposit=success`,\n',
        '        cancelUrl: `${baseUrl}?deposit=cancelled`,\n',
        '      },\n',
        '    });\n',
        '    if (error || !data?.success || !data?.approvalUrl) {\n',
        '      throw new Error(data?.error || error?.message || "Could not start deposit payment");\n',
        '    }\n',
        '    window.location.assign(data.approvalUrl);\n',
        '  };\n',
        '\n'
    ]
    
    # Replace from submit1_start to submit2_start
    del lines[submit1_start:submit2_start]
    for i, f_line in enumerate(new_funcs):
        lines.insert(submit1_start + i, f_line)

# Fix "v is possibly undefined" in line 403 (approx, depends on deletion)
for i, line in enumerate(lines):
    if 'const v = vehicles[vIdx];' in line:
        lines[i] = '  const v = vehicles[vIdx] || emptyVehicle();\n'
    if 'if (vErr) return toast({ title: vErr, variant: "destructive" });' in line:
        # Fix line 241 (now shifted)
        lines[i] = '    const vCurrent = vehicles[vIdx];\n    if (!vCurrent) return;\n    const vErr = validateVehicle(vCurrent);\n    if (vErr) return toast({ title: vErr, variant: "destructive" });\n'

with open('src/pages/rentals/HostApplication.tsx', 'w') as f:
    f.writelines(lines)
