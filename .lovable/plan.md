

## Add Home Button to EventsDimesOnly Page

The `src/pages/EventsDimesOnly.tsx` page is missing the Home button that was added to the other pages.

### Change

**`src/pages/EventsDimesOnly.tsx`**
- Import `Home` from lucide-react (line 29-41)
- Add a Home button at line 799, before the heading area, inside the `w-full px-4 py-6` div — matching the same style used on the other pages:

```tsx
<div className="flex justify-start mb-4">
  <Button
    onClick={() => navigate("/dashboard")}
    className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-semibold"
  >
    <Home className="mr-2 h-4 w-4" /> Home
  </Button>
</div>
```

Single file, single addition.

