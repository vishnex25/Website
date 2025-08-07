# Contact Form Setup & Configuration Guide

## 🚀 Quick Start

Your contact form system is now fully implemented with advanced features! Here's how to get it running:

### 1. Environment Configuration

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Configure your email settings in `.env`:**
   ```env
   # For Gmail (recommended)
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-16-character-app-password
   ADMIN_EMAIL=admin@vishnorex.com
   
   # Server settings
   PORT=3000
   ALLOWED_ORIGINS=*
   ```

### 2. Gmail App Password Setup

1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Enable **2-Factor Authentication** (required)
3. Go to **Security** → **App passwords**
4. Generate a new app password for "Mail"
5. Copy the 16-character password (no spaces) to your `.env` file

### 3. Alternative Email Providers

#### For Outlook/Hotmail:
```env
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password
```

#### For Custom SMTP:
```env
EMAIL_USER=your-email@domain.com
EMAIL_PASS=your-password
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
```

### 4. Start the Server

```bash
npm start
```

Visit: http://localhost:3000

## ✨ Features Implemented

### 📋 Contact Form Processing
- ✅ Real-time form validation
- ✅ Field-specific error messages
- ✅ Visual validation indicators
- ✅ Enhanced loading states with spinner
- ✅ Mobile-responsive design

### 📄 PDF Generation
- ✅ Professional PDF layout with company branding
- ✅ Structured information display
- ✅ Submission ID and timestamp
- ✅ Enhanced formatting and styling
- ✅ Proper handling of long messages

### 📧 Email Integration
- ✅ Multi-provider support (Gmail, Outlook, Custom SMTP)
- ✅ Professional HTML email templates
- ✅ PDF attachment functionality
- ✅ Responsive email design
- ✅ Detailed submission information

### 🔔 User Feedback
- ✅ Enhanced notification system
- ✅ Mobile-responsive notifications
- ✅ Success/error/info message types
- ✅ Auto-dismiss with manual close option
- ✅ Smooth animations

### 🛡️ Security & Error Handling
- ✅ Rate limiting (3 submissions per 15 minutes per IP)
- ✅ Input sanitization and validation
- ✅ Spam detection with keyword filtering
- ✅ CORS protection
- ✅ Security headers
- ✅ Comprehensive error handling
- ✅ Network error detection

## 🧪 Testing Your Setup

### 1. Basic Functionality Test
1. Fill out the contact form with valid information
2. Check for real-time validation feedback
3. Submit the form and verify success notification
4. Check your admin email for the message with PDF attachment

### 2. Validation Testing
- Try submitting with empty required fields
- Test invalid email formats
- Test messages that are too short/long
- Verify field-specific error messages appear

### 3. Rate Limiting Test
- Submit the form 4 times quickly
- The 4th submission should be blocked with a rate limit message

### 4. Mobile Testing
- Test the form on mobile devices
- Verify notifications appear correctly on small screens
- Check form validation on mobile

## 🔧 Troubleshooting

### Email Not Sending
1. **Check Gmail App Password:**
   - Ensure 2FA is enabled
   - Use the 16-character app password, not your regular password
   - Remove any spaces from the password

2. **Check Environment Variables:**
   ```bash
   # Verify your .env file exists and has correct values
   cat .env
   ```

3. **Check Server Logs:**
   - Look for error messages in the terminal
   - Common issues: authentication failures, network problems

### PDF Generation Issues
- Ensure the server has write permissions
- Check for memory issues with large messages
- Verify PDFMake dependencies are installed

### Form Validation Problems
- Check browser console for JavaScript errors
- Ensure all required form fields have proper names
- Verify field validation rules match server-side validation

### Rate Limiting Issues
- Rate limits reset every 15 minutes
- Clear browser cache if testing repeatedly
- Check server logs for rate limit messages

## 📊 Monitoring & Logs

### Server Logs
The server logs important information:
- Form submissions received
- Email sending status
- PDF generation status
- Rate limiting actions
- Error messages

### Health Check
Visit: http://localhost:3000/health
Returns server status and timestamp.

## 🚀 Production Deployment

### Environment Variables for Production
```env
# Use specific domain instead of *
ALLOWED_ORIGINS=https://yourdomain.com

# Use strong, unique passwords
EMAIL_PASS=your-secure-app-password

# Set admin email
ADMIN_EMAIL=admin@yourdomain.com
```

### Security Considerations
- Use HTTPS in production
- Set specific CORS origins
- Monitor rate limiting logs
- Regular security updates
- Consider using a dedicated email service (SendGrid, Mailgun)

## 📞 Support

If you encounter issues:
1. Check this troubleshooting guide
2. Review server logs for error messages
3. Verify environment configuration
4. Test with different email providers if needed

Your contact form system is now production-ready with enterprise-level features!
