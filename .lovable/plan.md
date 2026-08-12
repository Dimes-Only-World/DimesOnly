# Plan: Rename Admin Tab Label to "S-F-B"

## Goal
Change the admin dashboard tab label from "Short Form Background" to "S-F-B".

## Current State
- The generic `TabsTrigger` component lives in `src/components/ui/tabs.tsx` and renders whatever children are passed to it.
- The actual label text is passed in `src/pages/AdminDashboard.tsx` at lines 175–177:
  ```tsx
  <TabsTrigger value="shortform" className="whitespace-nowrap">
    Short Form Background
  </TabsTrigger>
  ```

## Change
Update `src/pages/AdminDashboard.tsx`:
- Replace the child text of the `value="shortform"` `TabsTrigger` from `Short Form Background` to `S-F-B`.

## Verification
- Build the project and confirm no TypeScript errors.
- Open `/admin` and verify the tab now displays "S-F-B".
