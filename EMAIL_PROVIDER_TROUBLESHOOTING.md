# Email Provider Troubleshooting Guide

## 🚨 **Yahoo Mail Issues - Common Problems & Solutions**

### **Problem 1: Emails Going to Spam**
**Solution:**
1. **Check Spam Folder** - Most common issue
2. **Add to Contacts**: Add `noreply@supabase.com` to your Yahoo contacts
3. **Mark as Not Spam**: If found in spam, mark as "Not Spam"
4. **Create Filter**: Set up a filter to move Supabase emails to inbox

### **Problem 2: Yahoo Blocking Automated Emails**
**Solution:**
1. **Disable Spam Protection**: Temporarily disable Yahoo's spam protection
2. **Check Security Settings**: Go to Yahoo Mail Settings → Security
3. **Allow External Senders**: Enable "Allow external senders"

### **Problem 3: Email Delivery Delays**
**Solution:**
1. **Wait 5-10 minutes** - Yahoo sometimes delays automated emails
2. **Check "All Mail"** - Sometimes emails appear there first
3. **Refresh inbox** - Force refresh your Yahoo inbox

## 📧 **Email Provider Specific Solutions**

### **Yahoo Mail:**
```
1. Go to Settings → Filters
2. Create new filter:
   - From: contains "supabase.com"
   - Action: Move to Inbox
   - Never send to Spam
```

### **Gmail:**
```
1. Check Spam folder
2. Search for: from:supabase.com
3. Add to contacts: noreply@supabase.com
```

### **Outlook/Hotmail:**
```
1. Check Junk folder
2. Add to Safe Senders: noreply@supabase.com
3. Check Focused/Other tabs
```

### **Apple Mail:**
```
1. Check Junk folder
2. Add to VIP list
3. Check All Mail folder
```

## 🔧 **Supabase Email Configuration Fixes**

### **1. Update Email Templates in Supabase Dashboard:**

Go to **Authentication → Email Templates** and update:

#### **Reset Password Template:**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Reset Your Password - DimesOnly</title>
    <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); padding: 30px; text-align: center; color: white; }
        .content { padding: 30px; }
        .button { display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>DimesOnly</h1>
        </div>
        <div class="content">
            <h2>Reset Your Password</h2>
            <p>We received a request to reset your password for your DimesOnly account.</p>
            <p>Click the button below to reset your password:</p>
            <a href="{{ .ConfirmationURL }}" class="button">Reset Password</a>
            <p><strong>If the button doesn't work, copy and paste this link:</strong></p>
            <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px;">{{ .ConfirmationURL }}</p>
            <p><strong>Security Note:</strong> This link expires in 24 hours. If you didn't request this, please ignore this email.</p>
        </div>
        <div class="footer">
            <p>&copy; 2025 DimesOnly. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
```

### **2. Configure SMTP Settings (Optional):**

If Supabase default emails don't work, set up custom SMTP:

1. **Go to Supabase Dashboard → Authentication → Settings**
2. **Enable Custom SMTP**
3. **Use a reliable email service:**
   - **SendGrid** (recommended)
   - **Mailgun**
   - **Amazon SES**

### **3. Test Email Delivery:**

```javascript
// Test in browser console
const testEmail = async () => {
  const { data, error } = await supabase.auth.resetPasswordForEmail('your-email@yahoo.com', {
    redirectTo: window.location.origin + '/reset-password'
  });
  console.log('Email result:', { data, error });
};
testEmail();
```

## 🚀 **Quick Fixes for Yahoo Mail**

### **Immediate Actions:**
1. **Check Spam folder** (90% of cases)
2. **Wait 5-10 minutes** for delivery
3. **Check "All Mail"** folder
4. **Search for "supabase"** in Yahoo search

### **Yahoo Settings:**
1. **Settings → Filters**
2. **Create filter for supabase.com**
3. **Move to Inbox, Never Spam**

### **Alternative Solutions:**
1. **Use different email** (Gmail, Outlook)
2. **Contact Yahoo support** if persistent issues
3. **Use custom SMTP** for better delivery

## 📱 **Mobile Email Apps**

### **Yahoo Mail App:**
- Check **Spam** folder
- Enable **"Show all folders"**
- Check **"All Mail"** section

### **Gmail App:**
- Check **Spam** folder
- Check **Promotions** tab
- Search for **"supabase"**

### **Outlook App:**
- Check **Junk** folder
- Check **Focused/Other** tabs
- Add to **Safe Senders**

## 🔍 **Debugging Steps**

### **1. Check Supabase Logs:**
- Go to **Logs** in Supabase Dashboard
- Look for **Authentication** logs
- Check for email sending errors

### **2. Test Different Email Providers:**
```bash
# Test with different emails
- Gmail: test@gmail.com
- Yahoo: test@yahoo.com  
- Outlook: test@outlook.com
- Hotmail: test@hotmail.com
```

### **3. Check Email Headers:**
- Look for **"X-Supabase"** headers
- Check **delivery status**
- Verify **sender reputation**

## ⚡ **Emergency Solutions**

### **If Emails Still Don't Work:**

1. **Use Magic Link Instead:**
   - Enable **Magic Links** in Supabase
   - Users can sign in without password

2. **Manual Password Reset:**
   - Admin can reset passwords directly
   - Use admin dashboard to change passwords

3. **Alternative Authentication:**
   - Use **OAuth providers** (Google, Facebook)
   - Bypass email issues entirely

## 📞 **Support Contacts**

### **Yahoo Support:**
- **Help Center**: https://help.yahoo.com
- **Community Forums**: https://community.yahoo.com

### **Supabase Support:**
- **Documentation**: https://supabase.com/docs
- **Community**: https://github.com/supabase/supabase/discussions

### **Email Service Providers:**
- **SendGrid**: https://sendgrid.com/support
- **Mailgun**: https://www.mailgun.com/support

## ✅ **Testing Checklist**

- [ ] Checked spam folder
- [ ] Added sender to contacts
- [ ] Created email filters
- [ ] Tested with different email providers
- [ ] Checked Supabase logs
- [ ] Verified email templates
- [ ] Tested on mobile devices
- [ ] Checked delivery delays

**Most email issues are resolved by checking the spam folder and adding the sender to contacts!** 📧
