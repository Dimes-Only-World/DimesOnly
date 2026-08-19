# Add a time-series chart for member leads

## What we're building
Add a stacked bar chart inside `SharedLeadsList.tsx` (the "My Leads" section on the Make Money tab) showing the member's own leads grouped by date.

## Chart details
- Type: stacked bar chart using `recharts` (already installed).
- Series: Total, Complete, Incomplete, More Info.
- X-axis: date (last 30 days with leads).
- Y-axis: lead count.
- Each lead is bucketed by its `created_at` date in UTC (`YYYY-MM-DD`).
- The chart will appear above the summary stat cards and respect the current name/area-code search filter.

## Files to change
- `src/components/SharedLeadsList.tsx`
  - Import `BarChart`, `Bar`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `Legend`, `ResponsiveContainer` from `recharts`.
  - Add a `LeadProductionChart` sub-component that derives daily buckets from the filtered leads.
  - Render the chart between the search input and the summary stat cards.

## Out of scope
- No database or edge function changes; the chart uses the lead data already fetched by `fetchSharedLeads`.
- No changes to the admin Leads tab.
