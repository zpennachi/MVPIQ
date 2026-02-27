# Football Feedback App Setup Script
# Run this script after installing Node.js

Write-Host "=== Football Feedback App Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    $npmVersion = npm --version
    Write-Host "✓ Node.js version: $nodeVersion" -ForegroundColor Green
    Write-Host "✓ npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "Then run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Dependencies installed" -ForegroundColor Green

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host ""
    Write-Host "Creating .env file from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✓ .env file created" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠ IMPORTANT: Please edit .env and add your keys:" -ForegroundColor Yellow
    Write-Host "  - NEXT_PUBLIC_SUPABASE_URL (from Supabase dashboard)" -ForegroundColor Yellow
    Write-Host "  - NEXT_PUBLIC_SUPABASE_ANON_KEY (from Supabase dashboard)" -ForegroundColor Yellow
    Write-Host "  - SUPABASE_SERVICE_ROLE_KEY (from Supabase dashboard)" -ForegroundColor Yellow
    Write-Host "  - Stripe keys (from Stripe dashboard)" -ForegroundColor Yellow
    Write-Host "  - NEXT_PUBLIC_APP_URL (http://localhost:3000 for dev)" -ForegroundColor Yellow
} else {
    Write-Host "✓ .env file already exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Set up Supabase:" -ForegroundColor Yellow
Write-Host "   - Create a project at https://supabase.com" -ForegroundColor White
Write-Host "   - Run the SQL schema from supabase/schema.sql in SQL Editor" -ForegroundColor White
Write-Host "   - Create a 'videos' bucket in Storage (make it public or configure RLS)" -ForegroundColor White
Write-Host ""
Write-Host "2. Set up Stripe:" -ForegroundColor Yellow
Write-Host "   - Create an account at https://stripe.com" -ForegroundColor White
Write-Host "   - Get your API keys from the dashboard" -ForegroundColor White
Write-Host "   - Set up webhook endpoint: https://your-domain.com/api/webhooks/stripe" -ForegroundColor White
Write-Host ""
Write-Host "3. Configure environment variables in .env" -ForegroundColor Yellow
Write-Host ""
Write-Host "=== Setup Complete! ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start the development server, run:" -ForegroundColor Green
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Then open: http://localhost:3000" -ForegroundColor Green
Write-Host ""
