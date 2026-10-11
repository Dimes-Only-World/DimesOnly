import re
import os

def fix_file(path, replacements):
    if not os.path.exists(path):
        return
    with open(path, 'r') as f:
        content = f.read()
    for old, new in replacements:
        content = content.replace(old, new)
    with open(path, 'w') as f:
        f.write(content)

# 1. RateGirls.tsx fix
# Fix the IIFE that I broke
rate_girls_replacements = [
    ('{(() => { const ref = referrers[user.id]; return ref && (', '{(() => { const ref = referrers[user.id]; return ref ? ('),
    ('                                  </div>\n                                </div>\n                              )}', '                                  </div>\n                                </div>\n                              ) : null; })()}'),
]
# Wait, let's just do a clean replacement for that whole block.
with open('src/pages/RateGirls.tsx', 'r') as f:
    rg_content = f.read()

rg_content = re.sub(
    r'\{userScores\[String\(rating\.user_id\)\] && \(\s*userScores\[String\(rating\.user_id\)\]\.total_score \+= Number\(rating\.rating\)\)\}',
    r'if (userScores[String(rating.user_id)]) { userScores[String(rating.user_id)].total_score += Number(rating.rating); }', # This was probably not in JSX
    rg_content
)

# Re-do RateGirls logic carefully
rg_content = rg_content.replace(
    'ratingsData.forEach((rating) => {\n          if (userScores[String(rating.user_id)]) {\n            const score = userScores[String(rating.user_id)]; if (score) score.total_score += Number(rating.rating);\n            if (score) score.rating_count += 1;\n          }\n        });',
    'ratingsData.forEach((rating) => {\n          const score = userScores[String(rating.user_id)];\n          if (score) {\n            score.total_score += Number(rating.rating);\n            score.rating_count += 1;\n          }\n        });'
)

# Fix the referrers block in RateGirls
referrer_block_pattern = r'\{(\(\(\) => \{ const ref = referrers\[user\.id\]; return ref && \(.*?\)\})\)\}'
def ref_replacer(m):
    inner = m.group(1)
    # The inner part is ((() => { const ref = referrers[user.id]; return ref && (... )})
    # It's already broken. Let's find the original start and end.
    return m.group(0) # placeholder

# Actually, I'll just look for the specific lines I see in `code--view`.
rg_content = rg_content.replace(
    '{(() => { const ref = referrers[user.id]; return ref && (\n                                <div className="flex items-center gap-2 border-t border-black/10 pt-2">',
    '{(() => { const ref = referrers[user.id]; return ref ? (\n                                <div className="flex items-center gap-2 border-t border-black/10 pt-2">'
)
rg_content = rg_content.replace(
    '                                  </div>\n                                </div>\n                              )}\n                            </div>',
    '                                  </div>\n                                </div>\n                              ) : null; })()}\n                            </div>'
)

with open('src/pages/RateGirls.tsx', 'w') as f:
    f.write(rg_content)

# 2. Rentals.tsx fix
fix_file('src/pages/Rentals.tsx', [
    ('.map(([Icon, title, copy]: [any, any, any]) => (', '.map(([Icon, title, copy]) => ('),
    ('{(Icon as any) && <Icon className="h-5 w-5 shrink-0 text-rental-primary" />}', '{(Icon as any) && <Icon className="h-5 w-5 shrink-0 text-rental-primary" />}')
])
# Wait, TS2604: JSX element type 'Icon' does not have any construct or call signatures.
# In React 19, you might need to use a variable that starts with a capital letter, but Icon already does.
# The issue is probably the destructuring type.
with open('src/pages/Rentals.tsx', 'r') as f:
    rentals_content = f.read()
rentals_content = rentals_content.replace(
    '.map(([Icon, title, copy]) => (',
    '.map(([Icon, title, copy]: [any, any, any]) => {'
)
rentals_content = rentals_content.replace(
    '<Icon className="h-5 w-5 shrink-0 text-rental-primary" />',
    'const IconComponent = Icon as any; return (\n            <div key={String(title)} className="flex items-center gap-3 py-5 sm:px-6 first:sm:pl-0">\n              <IconComponent className="h-5 w-5 shrink-0 text-rental-primary" />'
)
# This is getting messy. I'll just use a simpler fix:
# .map(([Icon, title, copy]) => { const IconComponent = Icon as any; return ( ... <IconComponent ... /> ... ) })

# 3. RentalDetails.tsx
fix_file('src/pages/RentalDetails.tsx', [
    ('toDate={startDate ? addDays(new Date(startDate), 200) : undefined}', 'toDate={startDate ? addDays(new Date(startDate), 200) : undefined}')
])
# The error was exactOptionalPropertyTypes. 
# RentalDatePicker Props: toDate?: Date | undefined;
# Passing undefined is fine if the type includes undefined. I already added it to RentalDatePicker.tsx.

# 4. SaleCommissionsPanel.tsx
fix_file('src/components/rentals/SaleCommissionsPanel.tsx', [
    ('<Person u={users[uid]} />', '<Person u={users[uid] ?? undefined} />'),
    ('<Person u={r.referrer_id ? users[r.referrer_id] : null} />', '<Person u={r.referrer_id ? users[r.referrer_id] : null} />'), # I fixed Person to accept null | undefined
    ('<Person u={r.upline_id ? users[r.upline_id] : null} />', '<Person u={r.upline_id ? users[r.upline_id] : null} />')
])

# 5. Rate.tsx cleanup
fix_file('src/pages/Rate.tsx', [
    ('src={url || ""}', 'src={url ?? ""}')
])

