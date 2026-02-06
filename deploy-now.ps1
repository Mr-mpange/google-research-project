# Quick Deploy Script
Write-Host "Deploying Research System to Google Cloud Run..." -ForegroundColor Cyan

$PROJECT_ID = "trans-campus-480505-i2"
gcloud config set project $PROJECT_ID

# Get API keys
Write-Host "`nEnter Google Gemini API Key:" -ForegroundColor Yellow
Write-Host "(Get from: https://makersuite.google.com/app/apikey)" -ForegroundColor Gray
$GEMINI_KEY = Read-Host

Write-Host "`nEnter Africa's Talking API Key:" -ForegroundColor Yellow
$AT_KEY = Read-Host

Write-Host "`nEnter Africa's Talking Username (default: sandbox):" -ForegroundColor Yellow
$AT_USERNAME = Read-Host
if ([string]::IsNullOrWhiteSpace($AT_USERNAME)) {
    $AT_USERNAME = "sandbox"
}

# Generate JWT secret
$JWT_SECRET = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))

# Store secrets
Write-Host "`nStoring secrets..." -ForegroundColor Yellow
try { echo $GEMINI_KEY | gcloud secrets create gemini-api-key --data-file=- 2>$null } catch { echo $GEMINI_KEY | gcloud secrets versions add gemini-api-key --data-file=- }
try { echo $AT_KEY | gcloud secrets create at-api-key --data-file=- 2>$null } catch { echo $AT_KEY | gcloud secrets versions add at-api-key --data-file=- }
try { echo $AT_USERNAME | gcloud secrets create at-username --data-file=- 2>$null } catch { echo $AT_USERNAME | gcloud secrets versions add at-username --data-file=- }
try { echo $JWT_SECRET | gcloud secrets create jwt-secret --data-file=- 2>$null } catch { echo $JWT_SECRET | gcloud secrets versions add jwt-secret --data-file=- }

Write-Host "Secrets stored!" -ForegroundColor Green

# Deploy
Write-Host "`nDeploying to Cloud Run (5-10 minutes)..." -ForegroundColor Cyan

gcloud run deploy research-system `
    --source . `
    --platform managed `
    --region us-central1 `
    --allow-unauthenticated `
    --memory 2Gi `
    --cpu 2 `
    --timeout 300 `
    --set-secrets="GEMINI_API_KEY=gemini-api-key:latest,AT_API_KEY=at-api-key:latest,JWT_SECRET=jwt-secret:latest,AT_USERNAME=at-username:latest" `
    --set-env-vars="NODE_ENV=production"

if ($LASTEXITCODE -eq 0) {
    $SERVICE_URL = gcloud run services describe research-system --region us-central1 --format="value(status.url)"
    Write-Host "`nDEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
    Write-Host "Service URL: $SERVICE_URL" -ForegroundColor White
    Write-Host "`nConfigure Africa's Talking:" -ForegroundColor Yellow
    Write-Host "USSD: $SERVICE_URL/ussd/callback" -ForegroundColor White
    Write-Host "Voice: $SERVICE_URL/voice/callback" -ForegroundColor White
} else {
    Write-Host "`nDeployment failed. Check errors above." -ForegroundColor Red
}
