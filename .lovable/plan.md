Plan:
1. Restore a single explicit favicon setup in `index.html` instead of relying on Settings injection alone.
2. Use the existing angel PNG assets as the source for standard browser icons: 16x16, 32x32, 192x192, and Apple touch icon.
3. Remove/avoid the ambiguous `/favicon.ico` fallback so Chrome cannot keep choosing an old/default ICO over the PNG links.
4. Add cache-busted icon URLs so Chrome requests the fresh files after publish.
5. Verify in the live preview that the page head contains the icon links and that the favicon asset resolves to the angel image.

Technical details:
- Chrome often prioritizes `/favicon.ico` and caches it aggressively, even when Lovable Settings shows a different icon.
- The current `index.html` has no favicon links, so the browser/default hosting behavior is controlling the tab icon.
- The safest fix is to make the app explicitly point to the known angel PNG files and remove conflicting fallback behavior.