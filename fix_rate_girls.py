import re
path = 'src/pages/RateGirls.tsx'
with open(path, 'r') as f:
    content = f.read()

# Fix userScores
content = re.sub(
    r'userScores\[String\(rating\.user_id\)\]\.total_score \+= Number\(rating\.rating\);',
    r'const score = userScores[String(rating.user_id)]; if (score) score.total_score += Number(rating.rating);',
    content
)
content = re.sub(
    r'userScores\[String\(rating\.user_id\)\]\.rating_count \+= 1;',
    r'if (score) score.rating_count += 1;',
    content
)

# Fix referrers access using a more precise match
old_ref_pattern = r'\{referrers\[user\.id\] && \(\s*<div className="flex items-center gap-2 border-t border-black/10 pt-2">.*?</div>\s*\)\}'
# I need to match across multiple lines
match = re.search(r'\{referrers\[user\.id\] && \((.*?)\)\}', content, re.DOTALL)
if match:
    inner = match.group(1)
    # Replace referrers[user.id] with ref
    inner = inner.replace('referrers[user.id]', 'ref')
    new_block = f'{{(() => {{ const ref = referrers[user.id]; return ref && ({inner}); }})()}}'
    content = content.replace(match.group(0), new_block)

with open(path, 'w') as f:
    f.write(content)
