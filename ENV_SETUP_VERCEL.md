# 🔐 Environment Variables Setup for Vercel

## Required Environment Variables

You need to add these environment variables to your Vercel project:

### 1. **DATABASE_URL**
```
postgresql+asyncpg://postgres:A0000000l123@db.ebrtihsffmlanqrdxdhy.supabase.co:5432/postgres
```
- **Description:** PostgreSQL connection string for Supabase
- **Required for:** Database operations

### 2. **SUPABASE_PASSWORD**
```
A0000000l123
```
- **Description:** Supabase database password
- **Required for:** Database authentication

### 3. **JWT_SECRET**
```
supersecret
```
- **⚠️ IMPORTANT:** Change this to a strong random string in production!
- **Description:** Secret key for JWT token generation
- **Required for:** User authentication
- **Generate a strong one:** Run `openssl rand -hex 32` or use https://randomkeygen.com/

### 4. **EIA_API_KEY**
```
G19nzdqrKjjAkYvnZt4KuKesf5eti3AhoHE7NSyR
```
- **Description:** Energy Information Administration API key
- **Required for:** Fetching fuel price data

### 5. **STRIPE_SECRET_KEY**
```
sk_test
```
- **⚠️ NOTE:** This is a test key. Replace with your actual Stripe key
- **Description:** Stripe API secret key
- **Required for:** Payment processing

### 6. **ALLOWED_ORIGINS**
```
https://your-app-name.vercel.app
```
- **⚠️ UPDATE THIS:** Replace with your actual Vercel deployment URL
- **Description:** CORS allowed origins
- **Required for:** Security (prevents unauthorized API access)

### 7. **USE_LOCAL_DB**
```
false
```
- **Description:** Whether to use local SQLite (false = use Supabase)
- **Required for:** Database selection

---

## 📋 How to Add Environment Variables to Vercel

### Option 1: Via Vercel Dashboard (Recommended)

1. **Go to your project:**
   - Visit: https://vercel.com/dashboard
   - Click on your project: **oil-price-tracker**

2. **Navigate to Settings:**
   - Click the **Settings** tab
   - Click **Environment Variables** in the left sidebar

3. **Add each variable:**
   - Click **Add New**
   - Enter the **Key** (e.g., `DATABASE_URL`)
   - Enter the **Value** (from above)
   - Select environment: **Production, Preview, and Development** (all three)
   - Click **Save**

4. **Repeat for all 7 variables** listed above

5. **Redeploy:**
   - Go to **Deployments** tab
   - Click the **•••** menu on the latest deployment
   - Click **Redeploy**
   - Check "Use existing Build Cache"
   - Click **Redeploy**

### Option 2: Via Vercel CLI

```powershell
# Login to Vercel
vercel login

# Add environment variables
vercel env add DATABASE_URL production
# Paste: postgresql+asyncpg://postgres:A0000000l123@db.ebrtihsffmlanqrdxdhy.supabase.co:5432/postgres

vercel env add SUPABASE_PASSWORD production
# Paste: A0000000l123

vercel env add JWT_SECRET production
# Paste: supersecret (or generate a strong one)

vercel env add EIA_API_KEY production
# Paste: G19nzdqrKjjAkYvnZt4KuKesf5eti3AhoHE7NSyR

vercel env add STRIPE_SECRET_KEY production
# Paste: sk_test (or your real key)

vercel env add ALLOWED_ORIGINS production
# Paste: https://your-app-name.vercel.app

vercel env add USE_LOCAL_DB production
# Paste: false

# Redeploy
vercel --prod
```

---

## ⚠️ Security Reminders

### Before Going to Production:

1. **Generate a strong JWT_SECRET:**
   ```powershell
   # On PowerShell
   -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
   ```
   
2. **Use production Stripe keys** (not test keys starting with `sk_test`)

3. **Update ALLOWED_ORIGINS** with your actual Vercel URL:
   - After first deployment, you'll get a URL like: `https://oil-price-tracker.vercel.app`
   - Update the variable to: `https://oil-price-tracker.vercel.app`

4. **Verify Supabase is active** (not paused)

---

## 🔍 How to Verify

After adding environment variables and redeploying:

1. **Check deployment logs:**
   - Go to Vercel Dashboard → Deployments
   - Click on the latest deployment
   - Check for errors in the build logs

2. **Test the health endpoint:**
   - Visit: `https://your-app-name.vercel.app/api/health`
   - Should return: `{"status": "healthy", "database": "connected"}`

3. **Test the frontend:**
   - Visit: `https://your-app-name.vercel.app`
   - Try to register/login
   - Check if price data loads

---

## 🐛 Troubleshooting

### "Unexpected token" or JSON parse errors
- **Cause:** Environment variables not set, API returning HTML errors
- **Fix:** Add all environment variables and redeploy

### Database connection errors
- **Cause:** DATABASE_URL incorrect or Supabase paused
- **Fix:** Verify DATABASE_URL and ensure Supabase is active

### CORS errors
- **Cause:** ALLOWED_ORIGINS doesn't include your Vercel URL
- **Fix:** Update ALLOWED_ORIGINS with your actual Vercel domain

### "Module not found" errors
- **Cause:** Dependencies not installed
- **Fix:** Check `api/requirements.txt` and redeploy

---

## 📝 Quick Checklist

- [ ] Added DATABASE_URL
- [ ] Added SUPABASE_PASSWORD
- [ ] Added JWT_SECRET (strong, not "supersecret")
- [ ] Added EIA_API_KEY
- [ ] Added STRIPE_SECRET_KEY (production key if going live)
- [ ] Added ALLOWED_ORIGINS (with your Vercel URL)
- [ ] Added USE_LOCAL_DB (set to "false")
- [ ] Redeployed the application
- [ ] Tested /api/health endpoint
- [ ] Tested login/register functionality
- [ ] Verified price data loads

---

**Once all variables are added, your deployment should work perfectly!** 🚀
