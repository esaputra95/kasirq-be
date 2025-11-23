# Environment Variables - Email Service

## Required Variables for Resend

Add these to your `.env` file:

```env
# Resend Email Service
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@kasirq.id

# Backend URL (untuk activation links)
BE_URL=https://your-production-url.com
```

## Setup Steps

### 1. Get Resend API Key

1. Sign up at https://resend.com
2. Go to **API Keys** in dashboard
3. Click **Create API Key**
4. Copy the key (starts with `re_`)
5. Add to `.env`

### 2. From Email Options

**For Testing (Default):**
```env
RESEND_FROM_EMAIL=onboarding@resend.dev
```

**For Production (Recommended):**
Verify your domain:
1. Go to **Domains** in Resend dashboard
2. Add your domain
3. Add DNS records to your domain
4. Once verified, use:
```env
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### 3. Production Deployment

Make sure to set these environment variables in your hosting platform:
- Vercel: Project Settings → Environment Variables
- Heroku: Config Vars
- AWS/VPS: `.env` file on server

## Migration from Gmail

**Old variables (no longer needed):**
```env
# EMAIL_USER=your-email@gmail.com  # ❌ Remove
# EMAIL_PASS=your-app-password     # ❌ Remove
```

**New variables (required):**
```env
RESEND_API_KEY=re_xxxxx           # ✅ Required
RESEND_FROM_EMAIL=onboarding@resend.dev  # ✅ Required
```
