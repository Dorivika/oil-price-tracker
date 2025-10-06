# 🚀 Vercel Deployment Guide for Oil Price Tracker

## Prerequisites
- Vercel account (sign up at https://vercel.com)
- Vercel CLI installed: `npm install -g vercel`
- GitHub account (optional, for automatic deployments)

## Project Structure for Vercel
```
oil_price_tracker/
├── api/                    # Serverless functions
│   ├── index.py           # Python API entry point
│   └── requirements.txt   # Python dependencies
├── client/                # React frontend
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── python_backend/        # Backend source code
│   ├── main.py           # FastAPI app
│   ├── database.py       # Database models
│   └── requirements.txt
└── vercel.json           # Vercel configuration
```

## 📋 Step-by-Step Deployment

### Step 1: Environment Variables Setup
Before deploying, you need to set up environment variables in Vercel dashboard:

**Required Variables:**
```bash
# Database (Supabase)
DATABASE_URL=postgresql+asyncpg://postgres:[PASSWORD]@[HOST]:5432/postgres
SUPABASE_PASSWORD=your_password_here

# Security
JWT_SECRET=your_super_secret_jwt_key_here
USE_LOCAL_DB=false

# External APIs
EIA_API_KEY=your_eia_api_key_here
STRIPE_SECRET_KEY=your_stripe_secret_key_here

# CORS
ALLOWED_ORIGINS=https://your-app-name.vercel.app,https://www.your-domain.com
```

### Step 2: Update Production URL
1. Open `client/vite.config.js`
2. Replace `'https://your-app-name.vercel.app'` with your actual Vercel app URL
   - You'll get this after first deployment, then update and redeploy

### Step 3: Deploy via Vercel CLI

#### A. Login to Vercel
```bash
vercel login
```

#### B. Link Your Project (First Time)
```bash
cd c:\Vivek\real_projects\oil_price_tracker
vercel
```

Follow the prompts:
- Set up and deploy? **Yes**
- Which scope? Select your account
- Link to existing project? **No**
- Project name? **oil-price-tracker** (or your preferred name)
- Directory? **./client** (the build directory)
- Override settings? **No**

#### C. Set Environment Variables
```bash
# Add each environment variable
vercel env add DATABASE_URL
vercel env add SUPABASE_PASSWORD
vercel env add JWT_SECRET
vercel env add EIA_API_KEY
vercel env add STRIPE_SECRET_KEY
vercel env add ALLOWED_ORIGINS
```

For each variable, select:
- Environment: **Production, Preview, Development**
- Enter the value when prompted

#### D. Deploy to Production
```bash
vercel --prod
```

### Step 4: Post-Deployment Setup

#### A. Update CORS Origins
1. Note your Vercel URL (e.g., `https://oil-price-tracker.vercel.app`)
2. Update the `ALLOWED_ORIGINS` environment variable in Vercel dashboard:
   ```
   https://oil-price-tracker.vercel.app
   ```

#### B. Update Vite Config
1. Edit `client/vite.config.js`
2. Replace line 20:
   ```javascript
   ? 'https://oil-price-tracker.vercel.app'  // Your actual URL
   ```
3. Redeploy:
   ```bash
   vercel --prod
   ```

#### C. Test Your Deployment
Visit your Vercel URL and test:
- ✅ Frontend loads
- ✅ Login/Register works
- ✅ Price data fetches
- ✅ Alerts and orders work

## 🔧 Alternative: Deploy via GitHub

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit for Vercel deployment"
git branch -M main
git remote add origin https://github.com/yourusername/oil-price-tracker.git
git push -u origin main
```

### Step 2: Connect to Vercel
1. Go to https://vercel.com/dashboard
2. Click "New Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `./`
   - **Build Command:** `cd client && npm install && npm run build`
   - **Output Directory:** `client/dist`
5. Add environment variables (same as above)
6. Click "Deploy"

### Step 3: Enable Auto-Deploy
- Every push to `main` branch will auto-deploy
- Pull requests create preview deployments

## 🔍 Troubleshooting

### Issue: API routes return 404
**Solution:** Make sure `api/index.py` exists and `vercel.json` has correct rewrites

### Issue: Database connection fails
**Solution:** 
1. Verify Supabase is unpaused
2. Check `DATABASE_URL` environment variable
3. Ensure connection pooling is enabled in Supabase

### Issue: Build fails
**Solution:**
1. Check build logs in Vercel dashboard
2. Ensure all dependencies are in `client/package.json`
3. Test build locally: `cd client && npm run build`

### Issue: CORS errors
**Solution:**
1. Update `ALLOWED_ORIGINS` to include your Vercel URL
2. Verify FastAPI CORS middleware is configured correctly

## 📱 Custom Domain (Optional)

### Add Custom Domain
1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your domain (e.g., `oilpricetracker.com`)
3. Follow DNS configuration instructions
4. Update `ALLOWED_ORIGINS` to include custom domain

## 🔄 Continuous Deployment

### Automatic Deployments
- **Production:** Push to `main` branch
- **Preview:** Create pull request
- **Development:** Push to any branch

### Manual Deployment
```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# View deployment logs
vercel logs
```

## 📊 Monitoring

### Vercel Dashboard
- View deployment logs
- Monitor function execution
- Check analytics
- Set up alerts

### Health Check
- Endpoint: `https://your-app.vercel.app/api/health`
- Should return: `{"status": "healthy", "database": "connected"}`

## 🎯 Production Checklist

Before going live:
- [ ] All environment variables set
- [ ] Supabase database is active and accessible
- [ ] EIA API key is valid
- [ ] Stripe keys are production keys (not test)
- [ ] JWT_SECRET is a strong, random string
- [ ] CORS origins are correctly configured
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate is active
- [ ] Test all user flows (login, register, data fetch, alerts, orders)
- [ ] Monitor first few hours for errors

## 🆘 Support

- **Vercel Docs:** https://vercel.com/docs
- **Vercel Support:** https://vercel.com/support
- **FastAPI on Vercel:** https://vercel.com/docs/functions/serverless-functions/runtimes/python

---

**Deployment Date:** $(date)  
**Deployed By:** Vivek  
**Project:** Oil Price Tracker  
**Tech Stack:** React + Vite + FastAPI + PostgreSQL (Supabase)
