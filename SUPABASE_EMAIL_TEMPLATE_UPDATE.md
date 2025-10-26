# Supabase Email Template Update Guide

## 🎯 **Goal:**
Make the password reset email look the same on both Gmail and Yahoo Mail with a beautiful, visible design.

## 📧 **New Email Design:**
- ✅ **Pink-to-Purple Gradient Header** - Same as Gmail screenshot
- ✅ **"DimesOnly" Branding** - Consistent branding
- ✅ **"Reset Password" Button** - Pink-to-purple gradient button
- ✅ **Professional Layout** - Clean, modern design
- ✅ **Security Warning** - Yellow warning box with 60-minute expiry
- ✅ **Fallback Link** - Copy-paste link if button doesn't work
- ✅ **Yahoo Mail Compatible** - Works on all email clients

## 🔧 **How to Update Supabase Email Template:**

### **Step 1: Go to Supabase Dashboard**
1. Open your browser
2. Go to: https://supabase.com/dashboard
3. Select your project: **DimesOnly**

### **Step 2: Navigate to Email Templates**
1. Click on **"Authentication"** in the left sidebar
2. Click on **"Email Templates"**
3. Select **"Reset Password"** template

### **Step 3: Replace the Template**
1. **Delete all existing content** in the template editor
2. **Copy the entire content** from `supabase/email-templates/simple-password-reset.html`
3. **Paste it** into the Supabase template editor

### **Step 4: Update Template Variables**
Make sure to replace these placeholders with Supabase variables:

**Current Template Uses:**
- `{{ .ConfirmationURL }}` - The password reset link

**Supabase Variables:**
- Gmail: Uses `{{ .ConfirmationURL }}`
- Some versions use: `{{ .Token }}`

**Check which variable your Supabase uses:**
- Look at the default template
- If it uses `{{ .Token }}`, replace `{{ .ConfirmationURL }}` with `{{ .Token }}`

### **Step 5: Save and Test**
1. Click **"Save"** button
2. Request a password reset
3. Check email in **both Gmail and Yahoo Mail**

## 📋 **Template Features:**

### **Visual Design:**
```
┌────────────────────────────────────────┐
│  🎨 DimesOnly (Pink-Purple Gradient)  │
├────────────────────────────────────────┤
│                                        │
│        Reset Password                  │
│                                        │
│  You requested a password reset...     │
│                                        │
│  ┌──────────────────────────────┐     │
│  │   Reset Password (Button)    │     │
│  └──────────────────────────────┘     │
│                                        │
│  If you didn't request this...         │
│                                        │
│  ┌──────────────────────────────┐     │
│  │ Copy-paste link if needed    │     │
│  └──────────────────────────────┘     │
│                                        │
│  ⚠️ Link expires in 60 minutes        │
│                                        │
├────────────────────────────────────────┤
│  © 2025 DimesOnly                     │
└────────────────────────────────────────┘
```

### **Color Scheme:**
- **Header**: Pink (#ec4899) to Purple (#8b5cf6) gradient
- **Button**: Same pink-to-purple gradient
- **Text**: Dark gray (#333333) for readability
- **Security Warning**: Yellow (#fff3cd) background
- **Footer**: Light gray (#f8f9fa) background

### **Button Style:**
- **Gradient**: Pink to Purple (same as header)
- **Padding**: 18px 40px (large, easy to click)
- **Font**: 18px bold white text
- **Shadow**: Subtle shadow for depth
- **Rounded**: 8px border radius

## 🧪 **Testing Checklist:**

### **Gmail Test:**
- [ ] Email received
- [ ] Header gradient shows correctly
- [ ] Button is visible and clickable
- [ ] Button gradient matches header
- [ ] Fallback link is visible
- [ ] Security warning shows

### **Yahoo Mail Test:**
- [ ] Email received (check spam folder)
- [ ] Header gradient shows correctly
- [ ] **Button is visible** (most important!)
- [ ] Button gradient renders properly
- [ ] Fallback link is visible
- [ ] Security warning shows

### **Mobile Test:**
- [ ] Responsive layout
- [ ] Button is large enough to tap
- [ ] Text is readable
- [ ] Links work on mobile

## ⚠️ **Important Notes:**

### **For Yahoo Mail:**
1. **Always check spam folder** first
2. **Add sender to contacts**: `noreply@supabase.com`
3. **Create email filter** to move to inbox
4. **Wait 5-10 minutes** for delivery

### **Template Variables:**
- Some Supabase projects use `{{ .ConfirmationURL }}`
- Others use `{{ .Token }}`
- Check your default template to see which one you have
- Replace accordingly

### **If Button Doesn't Show:**
- The fallback text link will always work
- Copy and paste the link manually
- This is why we include the fallback section

## 🚀 **Expected Results:**

### **Before Update:**
- ❌ Different design on Gmail vs Yahoo
- ❌ Button might not be visible on Yahoo
- ❌ Inconsistent branding

### **After Update:**
- ✅ **Same design** on Gmail and Yahoo
- ✅ **Button visible** on all email clients
- ✅ **Professional appearance**
- ✅ **Consistent branding** with DimesOnly
- ✅ **Fallback link** always available
- ✅ **Mobile responsive**

## 📞 **Troubleshooting:**

### **Button Not Showing:**
1. Check if email client supports CSS gradients
2. Use fallback text link
3. Try different email client
4. Contact Supabase support

### **Wrong Variable Name:**
- If `{{ .ConfirmationURL }}` doesn't work
- Try `{{ .Token }}`
- Check Supabase documentation for your version

### **Email Not Received:**
1. Check spam folder
2. Add sender to contacts
3. Wait 5-10 minutes
4. Try different email address

**The email template is now updated to look the same on both Gmail and Yahoo Mail!** 🎯
