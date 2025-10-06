# Oil Price Tracker - Vercel Deployment Script
# Run this script from the project root

Write-Host "🚀 Oil Price Tracker - Vercel Deployment" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if vercel CLI is installed
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Vercel CLI not found. Installing..." -ForegroundColor Red
    npm install -g vercel
} else {
    Write-Host "✅ Vercel CLI found" -ForegroundColor Green
}

Write-Host ""
Write-Host "Choose deployment option:" -ForegroundColor Yellow
Write-Host "1. Deploy to Preview (test environment)" -ForegroundColor White
Write-Host "2. Deploy to Production" -ForegroundColor White
Write-Host "3. Set Environment Variables" -ForegroundColor White
Write-Host "4. View Deployment Logs" -ForegroundColor White
Write-Host "5. Cancel" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1-5)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "📦 Deploying to Preview..." -ForegroundColor Cyan
        vercel
    }
    "2" {
        Write-Host ""
        Write-Host "🎯 Deploying to Production..." -ForegroundColor Cyan
        Write-Host "⚠️  Make sure you have:" -ForegroundColor Yellow
        Write-Host "   - Set all environment variables" -ForegroundColor Yellow
        Write-Host "   - Updated vite.config.js with your Vercel URL" -ForegroundColor Yellow
        Write-Host "   - Tested in preview first" -ForegroundColor Yellow
        Write-Host ""
        $confirm = Read-Host "Continue? (y/n)"
        if ($confirm -eq "y") {
            vercel --prod
        } else {
            Write-Host "❌ Deployment cancelled" -ForegroundColor Red
        }
    }
    "3" {
        Write-Host ""
        Write-Host "🔧 Setting Environment Variables..." -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Required variables:" -ForegroundColor Yellow
        Write-Host "  - DATABASE_URL" -ForegroundColor White
        Write-Host "  - SUPABASE_PASSWORD" -ForegroundColor White
        Write-Host "  - JWT_SECRET" -ForegroundColor White
        Write-Host "  - EIA_API_KEY" -ForegroundColor White
        Write-Host "  - STRIPE_SECRET_KEY" -ForegroundColor White
        Write-Host "  - ALLOWED_ORIGINS" -ForegroundColor White
        Write-Host ""
        $varName = Read-Host "Enter variable name (or 'exit' to quit)"
        if ($varName -ne "exit") {
            vercel env add $varName
        }
    }
    "4" {
        Write-Host ""
        Write-Host "📋 Viewing Deployment Logs..." -ForegroundColor Cyan
        vercel logs
    }
    "5" {
        Write-Host ""
        Write-Host "👋 Deployment cancelled" -ForegroundColor Yellow
    }
    default {
        Write-Host ""
        Write-Host "❌ Invalid choice" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "📚 For detailed instructions, see VERCEL_DEPLOYMENT.md" -ForegroundColor Cyan
Write-Host ""
