# 🚀 One-Click Deployment Script for Google Cloud Run (PowerShell)
# This script automates the entire deployment process for Windows users

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting deployment to Google Cloud Run..." -ForegroundColor Cyan
Write-Host ""

# Function to print colored output
function Print-Success {
    param($Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Print-Error {
    param($Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Print-Info {
    param($Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Yellow
}

# Check if gcloud is installed
try {
    $null = Get-Command gcloud -ErrorAction Stop
    Print-Success "Google Cloud SDK found"
} catch {
    Print-Error "Google Cloud SDK not found. Please install it first:"
    Write-Host "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
}

# Get project ID
Print-Info "Enter your Google Cloud Project ID:"
$PROJECT_ID = Read-Host

if ([string]::IsNullOrWhiteSpace($PROJECT_ID)) {
    Print-Error "Project ID cannot be empty"
    exit 1
}

# Set project
Print-Info "Setting project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID
Print-Success "Project set"

# Enable required APIs
Print-Info "Enabling required APIs (this may take 2-3 minutes)..."
gcloud services enable run.googleapis.com `
    cloudbuild.googleapis.com `
    sqladmin.googleapis.com `
    storage.googleapis.com `
    speech.googleapis.com `
    secretmanager.googleapis.com
Print-Success "APIs enabled"

# Get API keys
Print-Info "Enter your Google Gemini API Key:"
$GEMINI_API_KEY = Read-Host

Print-Info "Enter your Africa's Talking API Key:"
$AT_API_KEY = Read-Host

Print-Info "Enter your Africa's Talking Username (default: sandbox):"
$AT_USERNAME = Read-Host
if ([string]::IsNullOrWhiteSpace($AT_USERNAME)) {
    $AT_USERNAME = "sandbox"
}

# Generate JWT secret
$JWT_SECRET = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
Print-Success "Generated JWT secret"

# Store secrets
Print-Info "Storing secrets in Secret Manager..."

# Helper function to create or update secret
function Set-Secret {
    param($Name, $Value)
    
    try {
        echo $Value | gcloud secrets create $Name --data-file=- 2>$null
    } catch {
        echo $Value | gcloud secrets versions add $Name --data-file=-
    }
}

Set-Secret "gemini-api-key" $GEMINI_API_KEY
Set-Secret "at-api-key" $AT_API_KEY
Set-Secret "at-username" $AT_USERNAME
Set-Secret "jwt-secret" $JWT_SECRET

Print-Success "Secrets stored"

# Ask if user wants to create Cloud SQL instance
Print-Info "Do you want to create a Cloud SQL instance? (y/n)"
$CREATE_DB = Read-Host

$CLOUDSQL_ARG = ""
$DB_ENV = "DB_HOST=localhost,DB_NAME=research_system"

if ($CREATE_DB -eq "y") {
    Print-Info "Creating Cloud SQL instance (this takes 5-10 minutes)..."
    
    $DB_PASSWORD = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(20))
    
    try {
        gcloud sql instances create research-db `
            --database-version=POSTGRES_14 `
            --tier=db-f1-micro `
            --region=us-central1 `
            --root-password=$DB_PASSWORD 2>$null
    } catch {
        Print-Info "Instance already exists"
    }
    
    try {
        gcloud sql databases create research_system --instance=research-db 2>$null
    } catch {
        Print-Info "Database already exists"
    }
    
    try {
        gcloud sql users create research_user `
            --instance=research-db `
            --password=$DB_PASSWORD 2>$null
    } catch {
        Print-Info "User already exists"
    }
    
    $CONNECTION_NAME = gcloud sql instances describe research-db --format="value(connectionName)"
    Print-Success "Cloud SQL instance created: $CONNECTION_NAME"
    
    $CLOUDSQL_ARG = "--add-cloudsql-instances $CONNECTION_NAME"
    $DB_ENV = "DB_HOST=/cloudsql/$CONNECTION_NAME,DB_NAME=research_system,DB_USER=research_user"
} else {
    Print-Info "Skipping Cloud SQL creation"
}

# Deploy to Cloud Run
Print-Info "Deploying to Cloud Run (this takes 5-10 minutes)..."

$deployCmd = "gcloud run deploy research-system " +
    "--source . " +
    "--platform managed " +
    "--region us-central1 " +
    "--allow-unauthenticated " +
    "--memory 2Gi " +
    "--cpu 2 " +
    "--timeout 300 " +
    "--min-instances 0 " +
    "--max-instances 10 " +
    "$CLOUDSQL_ARG " +
    "--set-secrets=`"GEMINI_API_KEY=gemini-api-key:latest,AT_API_KEY=at-api-key:latest,JWT_SECRET=jwt-secret:latest,AT_USERNAME=at-username:latest`" " +
    "--set-env-vars=`"NODE_ENV=production,$DB_ENV`""

Invoke-Expression $deployCmd

Print-Success "Deployment complete!"

# Get service URL
$SERVICE_URL = gcloud run services describe research-system --region us-central1 --format="value(status.url)"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🎉 Deployment Successful!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Service URL: $SERVICE_URL" -ForegroundColor White
Write-Host ""
Write-Host "Test your deployment:" -ForegroundColor Yellow
Write-Host "  curl $SERVICE_URL/health" -ForegroundColor White
Write-Host ""
Write-Host "Configure Africa's Talking webhooks:" -ForegroundColor Yellow
Write-Host "  USSD: $SERVICE_URL/ussd/callback" -ForegroundColor White
Write-Host "  Voice: $SERVICE_URL/voice/callback" -ForegroundColor White
Write-Host "  SMS: $SERVICE_URL/sms/delivery-report" -ForegroundColor White
Write-Host ""
Write-Host "View logs:" -ForegroundColor Yellow
Write-Host "  gcloud run services logs tail research-system --region us-central1" -ForegroundColor White
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Test health endpoint
Print-Info "Testing health endpoint..."
try {
    $response = Invoke-WebRequest -Uri "$SERVICE_URL/health" -UseBasicParsing
    if ($response.Content -like "*healthy*") {
        Print-Success "Health check passed!"
    } else {
        Print-Error "Health check failed. Check logs for details."
    }
} catch {
    Print-Error "Health check failed. Check logs for details."
}

Write-Host ""
Print-Success "All done! Your application is live at: $SERVICE_URL"
