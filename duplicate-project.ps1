# PowerShell script to duplicate the project
# Usage: .\duplicate-project.ps1 -NewProjectName "my-new-project"

param(
    [Parameter(Mandatory=$true)]
    [string]$NewProjectName,
    
    [string]$SourcePath = ".",
    [string]$ParentDirectory = ".."
)

Write-Host "🚀 Duplicating project to: $NewProjectName" -ForegroundColor Cyan

# Get the current directory
$CurrentDir = Get-Location
$SourceDir = Join-Path $CurrentDir $SourcePath
$TargetDir = Join-Path $ParentDirectory $NewProjectName

# Check if target directory already exists
if (Test-Path $TargetDir) {
    Write-Host "❌ Error: Directory $TargetDir already exists!" -ForegroundColor Red
    Write-Host "Please choose a different name or delete the existing directory." -ForegroundColor Yellow
    exit 1
}

# Copy the project
Write-Host "📁 Copying project files..." -ForegroundColor Yellow
Copy-Item -Path $SourceDir -Destination $TargetDir -Recurse -Exclude @(
    "node_modules",
    ".next",
    ".git",
    "*.log",
    ".env.local",
    ".env",
    ".DS_Store"
)

Write-Host "✅ Project copied successfully!" -ForegroundColor Green

# Navigate to new project
Set-Location $TargetDir

# Update package.json
Write-Host "📝 Updating package.json..." -ForegroundColor Yellow
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
$packageJson.name = $NewProjectName
$packageJson.description = "New project based on MVP-IQ"
$packageJson | ConvertTo-Json -Depth 10 | Set-Content "package.json"

# Remove old git remote if exists
if (Test-Path ".git") {
    Write-Host "🔧 Removing old git remote..." -ForegroundColor Yellow
    git remote remove origin 2>$null
    Write-Host "✅ Git remote removed. Add your new remote with: git remote add origin <your-repo-url>" -ForegroundColor Green
}

# Create .env.local template
Write-Host "📝 Creating .env.local template..." -ForegroundColor Yellow
@"
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=your-webhook-secret

# Resend
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=your-email@yourdomain.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
"@ | Out-File -FilePath ".env.local" -Encoding utf8

Write-Host ""
Write-Host "✅ Project duplication complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "  1. cd $NewProjectName" -ForegroundColor White
Write-Host "  2. Update .env.local with your credentials" -ForegroundColor White
Write-Host "  3. Create a new Supabase project and run migrations" -ForegroundColor White
Write-Host "  4. npm install" -ForegroundColor White
Write-Host "  5. npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "📖 See DUPLICATE_PROJECT.md for detailed setup instructions" -ForegroundColor Yellow

Set-Location $CurrentDir
