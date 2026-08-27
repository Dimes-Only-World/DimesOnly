# Fit the profile image inside its circle

## Change
- Keep the enlarged circular profile frame on `/rate` at its current dimensions.
- Change the image scaling from cropped (`object-cover`) to fully visible (`object-contain`).
- Add modest internal padding while preserving the circular border, background, overlap position, and image-lightbox click behavior.

## Verification
- Confirm the avatar remains circular and centered on mobile and desktop.
- Confirm the full image is visible without unintended cropping and the enlarged-image dialog still opens and closes correctly.
