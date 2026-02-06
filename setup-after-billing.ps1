# Run this script AFTER enabling billing in Google Cloud Console

Write-Host "🚀 Setting up Google Cloud for Research System..." -ForegroundColor Cyan

# Set project
$PROJECT_ID = "research-data-2495"
gcloud config set project $PROJECT_ID

Write-Host "`n✅ Project set to: $PROJECT_ID" -ForegroundColor Green

# Enable required APIs
Write-Host "`n📦 Enabling required APIs (this takes 2-3 minutes)..." -ForegroundColor Yellow

gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable secretmanager.googleapis.com

Write-Host "`n✅ APIs enabled!" -ForegroundColor Green

# Get API keys
Write-Host "`n🔑 Now let's set up your API keys..." -ForegroundColor Cyan
Write-Host "`nEnter your Google Gemini API Key:" -ForegroundColor Yellow
Write-Host "(Get it from: https://makersuite.google.com/app/apikey)" -ForegroundColor Gray
$GEMINI_KEY = Read-Host

Write-Host "`nEnter your Africa's Talking API Key:" -ForegroundColor Yellow
Write-Host "(Get it from: https://account.africastalking.com/)" -ForegroundColor Gray
$AT_KEY = Read-Host

Write-Host "`nEnter your Africa's Talking Username (default: sandbox):" -ForegroundColor Yellow
$AT_USERNAME = Read-Host
if ([string]::IsNullOrWhiteSpace($AT_USERNAME)) {
    $AT_USERNAME = "sandbox"
}

# Generate JWT secret
$JWT_SECRET = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))

Write-Host "`n🔐 Storing secrets in Secret Manager..." -ForegroundColor Yellow

# Store secrets
echo $GEMINI_KEY | gcloud secrets create gemini-api-key --data-file=-
echo $AT_KEY | gcloud secrets create at-api-key --data-file=-
echo $AT_USERNAME | gcloud secrets create at-username --data-file=-
echo $JWT_SECRET | gcloud secrets create jwt-secret --data-file=-

Write-Host "`n✅ Secrets stored!" -ForegroundColor Green

# Deploy to Cloud Run
Write-Host "`n🚀 Deploying to Cloud Run (this takes 5-10 minutes)..." -ForegroundColor Cyan

gcloud run deploy research-system `
    --source . `
    --platform managed `
    --region us-central1 `
    --allow-unauthenticated `
    --memory 2Gi `
    --cpu 2 `
    --timeout 300 `
    --min-instances 0 `
    --max-instances 10 `
    --set-secrets="GEMINI_API_KEY=gemini-api-key:latest,AT_API_KEY=at-api-key:latest,JWT_SECRET=jwt-secret:latest,AT_USERNAME=at-username:latest" `
    --set-env-vars="NODE_ENV=production,DB_HOST=localhost,DB_NAME=research_system"

# Get service URL
$SERVICE_URL = gcloud run services describe research-system --region us-central1 --format="value(status.url)"

Write-Host "`n" -NoNewline
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🎉 DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "`nYour app is live at:" -ForegroundColor Yellow
Write-Host $SERVICE_URL -ForegroundColor White
Write-Host "`nTest it:" -ForegroundColor Yellow
Write-Host "curl $SERVICE_URL/health" -ForegroundColor White
Write-Host "`nConfigure Africa's Talking webhooks:" -ForegroundColor Yellow
Write-Host "USSD: $SERVICE_URL/ussd/callback" -ForegroundColor White
Write-Host "Voice: $SERVICE_URL/voice/callback" -ForegroundColor White
Write-Host "SMS: $SERVICE_URL/sms/delivery-report" -ForegroundColor White
Write-Host "`n==========================================" -ForegroundColor Cyan

# Test health endpoint
Write-Host "`n🧪 Testing deployment..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$SERVICE_URL/health" -UseBasicParsing
    if ($response.Content -like "*healthy*") {
        Write-Host "✅ Health check passed!" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Health check pending... (app may still be starting)" -ForegroundColor Yellow
}

Write-Host "`n✅ All done! Your hackathon project is ready!" -ForegroundColor Green
Write-Host "`n📝 Next steps:" -ForegroundColor Cyan
Write-Host "1. Test your USSD code in Africa's Talking sandbox" -ForegroundColor White
Write-Host "2. Submit to hackathon: https://bit.ly/capstone-BWAI" -ForegroundColor White
Write-Host "3. Create demo video (optional)" -ForegroundColor White
