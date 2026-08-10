# Restore the uploaded favicon

## Goal
Use the uploaded angel image as the browser favicon without converting it to SVG.

## Changes
1. Convert the uploaded 513×430 PNG into square, padded raster icons so the artwork keeps its proportions and is not stretched or cropped.
2. Create the browser and device files currently referenced by the site:
   - `favicon.ico` with common embedded sizes
   - `favicon-16x16.png`
   - `favicon-32x32.png`
   - `apple-touch-icon.png` at 180×180
   - `favicon-192x192.png`
   - `favicon-512x512.png`
3. Create `manifest.webmanifest` with the 192×192 and 512×512 icons for installed/mobile use.
4. Update the favicon links in the main document with a new cache-busting version so browsers request the replacement rather than reusing an old cached icon.
5. Add equivalent favicon declarations to the standalone landing document so it uses the same identity if served independently.
6. Verify every declared icon URL responds successfully and inspect the rendered browser tab icon.

## Technical notes
- The favicon files must be real files in `public/`; CDN asset pointers are not suitable for browser favicon fallbacks.
- PNG is fully supported. SVG would not solve the current issue because the referenced files are absent.
- Browsers cache favicons aggressively; after deployment, a hard refresh or clearing the site favicon cache may still be needed once.