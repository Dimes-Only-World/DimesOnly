
The automatic referrer for new signups that do not use a referral link is **"Company"**. 

When a user signs up without a `?ref=username` parameter in their URL, the system automatically defaults their `referred_by` value to **Company** in the database.

This is enforced in both the frontend and backend of your application:
- **Frontend** (`src/pages/Register.tsx`): Automatically sends "Company" if the referral field is empty.
- **Backend** (`supabase/functions/register-user/index.ts`): Has a fallback to set the referrer to "Company" if it's missing during the account creation process.
