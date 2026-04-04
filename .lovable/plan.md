

# Add Explainer Videos to Registration Form Based on Gender/Type Selection

## What This Does
When a user selects their gender or user type during registration, a relevant explainer video appears below the selection. There are 4 videos total:
- **Male selected** → 1 video appears below the gender radio buttons
- **Female Normal selected** → 1 video appears below the user type selection
- **Female Exotic selected** → 1 video appears below the user type selection
- **Female Stripper selected** → 1 video appears below the user type selection

Videos are managed from the database (`page_videos` table) so the admin can swap them later without code changes.

## Database Setup
Add 4 new rows to the `page_videos` table with these keys:
- `register_male`
- `register_female_normal`
- `register_female_exotic`
- `register_female_stripper`

Seed each with a placeholder video URL (can use any working mp4 URL).

## File Changes

### `src/components/RegistrationFormFields.tsx`
1. Import `usePageVideo` hook and the `BannerVideo` component
2. Add 4 `usePageVideo` calls for each registration key
3. After the gender radio group (line ~416), if `formData.gender === "male"` and the male video URL exists, render a `BannerVideo` with the male explainer video
4. After the user type radio group (line ~491), render the matching video based on `formData.userType`:
   - `"normal"` → `register_female_normal` video
   - `"exotic"` → `register_female_exotic` video
   - `"stripper"` → `register_female_stripper` video

Each video block will be wrapped in a simple container with rounded corners and will use the existing `BannerVideo` component (starts paused with center play button, consistent with the rest of the app).

### Admin Video Management
The new keys will automatically appear in the admin video tab since it reads from `page_videos`. The admin can update these URLs at any time.

