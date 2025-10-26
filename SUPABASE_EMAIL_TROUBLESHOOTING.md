# Supabase Email Troubleshooting Guide

## Why Password Reset Emails Don't Arrive

### 1. Check Supabase Email Settings

Go to your Supabase Dashboard:
1. **Authentication → Settings**
2. **Check "Enable email confirmations"** is ON
3. **Check "Enable email change confirmations"** is ON
4. **Check "Enable password recovery"** is ON

### 2. Check Email Provider Settings

In Supabase Dashboard → Authentication → Settings:

#### **SMTP Settings (if using custom email)**
- Make sure SMTP is properly configured
- Check if you're using Supabase's default email or custom SMTP

#### **Site URL Configuration**
- **Site URL**: Should be your production domain (e.g., `https://yourdomain.com`)
- **Redirect URLs**: Should include your reset password page URL

### 3. Check Email Templates

Go to **Authentication → Email Templates**:
1. **Reset Password** template should be enabled
2. **Check if template is properly configured**
3. **Test the template** by sending a test email

### 4. Common Issues & Solutions

#### **Issue: Emails go to Spam**
**Solution**: 
- Add Supabase to your email whitelist
- Check spam folder regularly
- Configure SPF/DKIM records if using custom domain

#### **Issue: Wrong redirect URL**
**Solution**:
- Set correct Site URL in Supabase
- Add `http://localhost:8080/reset-password` to redirect URLs for development
- Add your production URL for live site

#### **Issue: Email provider blocking**
**Solution**:
- Some email providers block automated emails
- Try with a different email provider (Gmail, Outlook, etc.)
- Check if your email provider has strict spam filters

### 5. Testing Steps

#### **Step 1: Test with Different Email**
Try password reset with:
- Gmail account
- Outlook account  
- Yahoo account
- Different email providers

#### **Step 2: Check Supabase Logs**
1. Go to **Logs** in Supabase Dashboard
2. Look for **Authentication** logs
3. Check for any errors in email sending

#### **Step 3: Test Email Template**
1. Go to **Authentication → Email Templates**
2. Click **"Send test email"**
3. Check if test email arrives

### 6. Quick Fixes

#### **Fix 1: Update Site URL**
```bash
# In Supabase Dashboard → Authentication → Settings
Site URL: http://localhost:8080  # For development
Site URL: https://yourdomain.com  # For production
```

#### **Fix 2: Add Redirect URLs**
```bash
# Add these URLs to redirect URLs:
http://localhost:8080/reset-password
https://yourdomain.com/reset-password
```

#### **Fix 3: Check Email Rate Limits**
- Supabase has rate limits for emails
- Wait 1-2 minutes between reset attempts
- Don't spam the reset button

### 7. Alternative Solutions

#### **Option 1: Use Magic Link Instead**
- Go to **Authentication → Settings**
- Enable **"Enable magic links"**
- Users can sign in with magic link instead of password

#### **Option 2: Custom Email Provider**
- Set up custom SMTP (SendGrid, Mailgun, etc.)
- Configure in Supabase → Authentication → Settings
- This gives you more control over email delivery

### 8. Debugging Commands

#### **Check Supabase Status**
```bash
# Check if Supabase is working
curl -X GET "https://qkcuykpndrolrewwnkwb.supabase.co/rest/v1/" \
  -H "apikey: YOUR_ANON_KEY"
```

#### **Test Email Function**
```javascript
// Test email sending in browser console
const { data, error } = await supabase.auth.resetPasswordForEmail('your-email@example.com', {
  redirectTo: 'http://localhost:8080/reset-password'
});
console.log('Email sent:', data, 'Error:', error);
```

### 9. Production Checklist

- [ ] Site URL is set correctly
- [ ] Redirect URLs include your domain
- [ ] Email templates are configured
- [ ] SMTP settings are correct (if using custom)
- [ ] Rate limits are not exceeded
- [ ] Email provider is not blocking emails
- [ ] SPF/DKIM records are set (if using custom domain)

### 10. Contact Support

If none of the above works:
1. **Check Supabase Status Page**: https://status.supabase.com/
2. **Contact Supabase Support**: Through your dashboard
3. **Check Supabase Community**: https://github.com/supabase/supabase/discussions

## Quick Test

Try this in your browser console to test email sending:

```javascript
// Replace with your actual email
const testEmail = async () => {
  const { data, error } = await supabase.auth.resetPasswordForEmail('your-email@gmail.com', {
    redirectTo: window.location.origin + '/reset-password'
  });
  console.log('Result:', { data, error });
};
testEmail();
```
