# Email Template Setup Guide

## Password Reset Email Button Visibility Fix

The issue with password reset email buttons not being visible on non-black backgrounds is due to Supabase's default email templates. Here's how to fix it:

### 1. Configure Custom Email Templates in Supabase

1. **Go to your Supabase Dashboard**
2. **Navigate to Authentication → Email Templates**
3. **Select "Reset Password" template**
4. **Replace the default template with the custom template**

### 2. Custom Email Template

Use the provided `supabase/email-templates/password-reset.html` file. This template includes:

- **High-contrast button styling** that works on any background
- **Gradient button** with proper contrast
- **Fallback text link** for accessibility
- **Mobile-responsive design**
- **Security notes** for user awareness

### 3. Template Variables

The template uses these Supabase variables:
- `{{ .ConfirmationURL }}` - The password reset link
- `{{ .SiteURL }}` - Your site URL
- `{{ .Email }}` - User's email address

### 4. Testing the Template

1. **Send a test password reset email**
2. **Check the email in different email clients** (Gmail, Outlook, Apple Mail)
3. **Verify button visibility** on different backgrounds
4. **Test the reset link functionality**

### 5. Additional Email Templates

You may also want to customize:
- **Confirm Signup** template
- **Magic Link** template
- **Change Email Address** template

### 6. CSS Considerations

The custom template includes:
- **Inline CSS** for maximum email client compatibility
- **High contrast colors** for accessibility
- **Responsive design** for mobile devices
- **Fallback styling** for older email clients

### 7. Supabase Configuration

In your Supabase project settings:

1. **Site URL**: Set to your production domain
2. **Redirect URLs**: Add your reset password page URL
3. **Email Settings**: Configure your SMTP settings if using custom email provider

### 8. Testing Checklist

- [ ] Button is visible on white background
- [ ] Button is visible on dark background  
- [ ] Button works on mobile devices
- [ ] Fallback text link works
- [ ] Email renders correctly in Gmail
- [ ] Email renders correctly in Outlook
- [ ] Email renders correctly in Apple Mail
- [ ] Reset link functionality works
- [ ] Security message is clear

### 9. Troubleshooting

If buttons still aren't visible:

1. **Check email client settings** - some clients block CSS
2. **Use the fallback text link** - always provide this option
3. **Test with different email providers** - some have stricter CSS filtering
4. **Consider using a table-based layout** for maximum compatibility

### 10. Production Deployment

1. **Test thoroughly** in staging environment
2. **Configure proper redirect URLs** in Supabase
3. **Set up monitoring** for failed password resets
4. **Document the process** for your team

This setup ensures that password reset emails are visible and functional across all email clients and backgrounds.
