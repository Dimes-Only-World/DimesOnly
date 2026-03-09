

## Add "Home" Button to Tip & Win, Dimes, Events, and Rate Pages

Add a prominent "Home" button on each of these four pages that navigates the user back to `/dashboard`.

### Changes

**1. `src/pages/TipGirls.tsx`**
- Import `Home` icon from lucide-react and `useNavigate` (already imported)
- Add a Home button at the top of the main content area (line ~264), before the JackpotDisplay section

**2. `src/pages/Dimes.tsx`**
- Import `useNavigate` from react-router-dom and `Home` + `Button`
- Add a Home button at the top of the page content area

**3. `src/pages/RateGirls.tsx`**
- Import `Home` icon from lucide-react
- Add a Home button after the video banner heading area (around line 214-216)

**4. `src/pages/EventsDimes.tsx`**
- Import `Home` icon from lucide-react
- Add a Home button after the heading area (around line 212-215)

All buttons will use a consistent style: a gradient button with a Home icon, positioned at the top of the content area for easy access.

