
Goal: make the second video use the exact same control style as the first video the user is pointing to on `/register`.

What I found:
- The explainer videos inside `RegistrationFormFields.tsx` already use `BannerVideo`.
- The uploaded preview videos inside `FileUploadField.tsx` also already use `BannerVideo`.
- But the bottom video on `/register` is not using `BannerVideo` at all. In `src/pages/Register.tsx` lines 622-631, it is rendered with a plain native `<video controls>` element.
- That means there are currently two different players on the page:
  1. `BannerVideo` custom player
  2. native browser `<video controls>` player
- So the reason they “look nothing alike” is simple: they are not the same component.

Implementation plan:
1. Edit `src/pages/Register.tsx`
   - Replace the plain bottom `<video controls>` block with `<BannerVideo />`
   - Use the same source URL currently hardcoded there
   - Keep `loop={false}` so behavior matches the explainer-style player

2. Add the missing import in `src/pages/Register.tsx`
   - Import `BannerVideo` from `@/components/BannerVideo`

3. Keep `src/components/FileUploadField.tsx` as-is for now
   - It already uses `BannerVideo`
   - No extra control-style work is needed there unless the user later wants the remove button repositioned

Expected result:
- The bottom `/register` video will no longer use browser-native controls
- It will render with the same custom centered play button, bottom bar, seek slider, mute, time, and fullscreen controls as the explainer video player

Technical details:
- Current mismatch source:
  - `src/components/RegistrationFormFields.tsx` → `BannerVideo`
  - `src/components/FileUploadField.tsx` → `BannerVideo`
  - `src/pages/Register.tsx` bottom block → native `<video controls>`
- Required change:
```tsx
{showVideo && (
  <div className="mt-6 rounded-lg overflow-hidden">
    <BannerVideo
      src="https://dimesonlyworld.s3.us-east-2.amazonaws.com/Copy+of+Explain+form+confirm+FINAL.webm"
      loop={false}
    />
  </div>
)}
```

Files to edit:
- `src/pages/Register.tsx`
