# Make the favicon deploy correctly

## Confirmed cause
The favicon markup is present, and every icon works on the local development server. However, `.gitignore` currently excludes the entire `public` directory, so the generated favicon files are omitted from the saved project. As a result, both the hosted preview and `dimesonly.world/favicon.ico` return 404.

## Changes
1. Correct `.gitignore` so Vite's source `public/` directory is included while generated build folders remain ignored.
2. Ensure the existing angel favicon set is saved with the project:
   - `favicon.ico`
   - 16×16 and 32×32 PNG icons
   - Apple touch icon
   - 192×192 and 512×512 manifest icons
   - `manifest.webmanifest`
3. Preserve the existing favicon declarations and cache-busting query string in both site documents.
4. Verify the saved preview serves every favicon URL successfully.
5. Run the required security check, then publish the corrected build if no critical findings block deployment.
6. Verify `https://dimesonly.world/favicon.ico` after deployment and advise a hard refresh/reopening the tab if the browser still displays its cached icon.

## Technical notes
- No SVG conversion is required; the raster favicon formats are correctly generated.
- The custom domain cannot display the new icon until the corrected files are included in a deployment.