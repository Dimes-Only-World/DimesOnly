## Changes to `src/components/RegistrationFormFields.tsx`

In the Profile Information section:

1. Change the label `Gender *` to `How do you want to register? *`.
2. Add a third `RadioGroupItem` next to Male and Female with value `business_owner`, id `business_owner`, label **Business Owner**.

No DB schema changes, no new membership tier, no edits to downstream submission logic — the new value will simply flow through the existing `gender` field as a string. The existing `showUserType` female sub-selector and male explainer video remain untouched (Business Owner shows neither).

If you later want Business Owner to drive a different signup flow (own user type, no female sub-questions, separate explainer video, DB column), tell me and I'll do a follow-up.