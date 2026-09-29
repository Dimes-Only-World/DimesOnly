# Rating Page Actions

## What will change
- Replace the signed-out red rating warning with visible **Login** and **Register** buttons above the upgrade button.
- Add a **Next Baddie** button directly beneath **Home**.
- Send signed-in members to their next unrated Dime while preserving referral information.
- When every available Dime has been rated, show:
  - “More Dimes beings added.”
  - “Find more Dimes and get paid!”

## Technical details
- Use the current rating-season records to exclude Dimes already rated by the signed-in member.
- Choose the next profile deterministically from the public performer list, excluding the profile currently open.
- Keep signed-out actions on the existing login and registration pages without showing a destructive toast.
