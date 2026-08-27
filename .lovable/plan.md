Update the label text for the total score metric so it spans two lines.

```text
Before: "Total Score"
After:  "Total\nScore"
```

## Technical details
- File: `src/pages/Rate.tsx`
- Target line: 761 (`<div className="text-xs text-gray-600">Total Score</div>`)
- Implementation: split the text into two spans separated by `<br />` to render a literal line break while keeping the existing styles.
- Verification: confirm the build passes and the `/rate` page renders the two-line label without layout regressions.