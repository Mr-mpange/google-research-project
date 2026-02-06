# Setup Cloud SQL Database for Research System

Write-Host "Setting up Cloud SQL Database..." -ForegroundColor Cyan

# Wait for instance to be ready
Write-Host "`nWaiting for Cloud SQL instance to be ready..." -ForegroundColor Yellow
$maxAttempts = 20
$attempt = 0

while ($attempt -lt $maxAttempts) {
    $state = gcloud sql instances describe research-db --format="value(state)"
    if ($state -eq "RUNNABLE") {
        Write-Host "Database instance is ready!" -ForegroundColor Green
        break
    }
    $attempt++
    Write-Host "Attempt $attempt/$maxAttempts - Status: $state - Waiting 30 seconds..." -ForegroundColor Gray
    Start-Sleep -Seconds 30
}

if ($attempt -eq $maxAttempts) {
    Write-Host "Timeout waiting for database. Please check Cloud Console." -ForegroundColor Red
    exit 1
}

# Get connection name
$CONNECTION_NAME = gcloud sql instances describe research-db --format="value(connectionName)"
Write-Host "`nConnection Name: $CONNECTION_NAME" -ForegroundColor White

# Create database
Write-Host "`nCreating database 'research_system'..." -ForegroundColor Yellow
gcloud sql databases create research_system --instance=research-db 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Database created!" -ForegroundColor Green
} else {
    Write-Host "Database already exists or error occurred" -ForegroundColor Yellow
}

# Create user
Write-Host "`nCreating database user..." -ForegroundColor Yellow
$DB_PASSWORD = "ResearchUser2026!"
gcloud sql users create research_user --instance=research-db --password=$DB_PASSWORD 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "User created!" -ForegroundColor Green
} else {
    Write-Host "User already exists or error occurred" -ForegroundColor Yellow
}

# Update Cloud Run with database connection
Write-Host "`nUpdating Cloud Run with database connection..." -ForegroundColor Yellow
gcloud run services update research-system `
    --region us-central1 `
    --add-cloudsql-instances $CONNECTION_NAME `
    --update-env-vars="DB_HOST=/cloudsql/$CONNECTION_NAME,DB_NAME=research_system,DB_USER=research_user,DB_PASSWORD=$DB_PASSWORD,DB_PORT=5432"

Write-Host "`nDatabase setup complete!" -ForegroundColor Green
Write-Host "`nConnection details:" -ForegroundColor Cyan
Write-Host "  Host: /cloudsql/$CONNECTION_NAME" -ForegroundColor White
Write-Host "  Database: research_system" -ForegroundColor White
Write-Host "  User: research_user" -ForegroundColor White
Write-Host "  Password: $DB_PASSWORD" -ForegroundColor White

# Run migrations
Write-Host "`nDo you want to run database migrations now? (y/n)" -ForegroundColor Yellow
$runMigrations = Read-Host

if ($runMigrations -eq "y") {
    Write-Host "`nInstalling Cloud SQL Proxy..." -ForegroundColor Yellow
    
    # Download Cloud SQL Proxy
    $proxyUrl = "https://dl.google.com/cloudsql/cloud_sql_proxy_x64.exe"
    $proxyPath = "cloud_sql_proxy.exe"
    
    if (-not (Test-Path $proxyPath)) {
        Invoke-WebRequest -Uri $proxyUrl -OutFile $proxyPath
    }
    
    Write-Host "Starting Cloud SQL Proxy..." -ForegroundColor Yellow
    $proxyProcess = Start-Process -FilePath $proxyPath -ArgumentList "-instances=$CONNECTION_NAME=tcp:5432" -PassThru -WindowStyle Hidden
    
    Start-Sleep -Seconds 5
    
    Write-Host "Running migrations..." -ForegroundColor Yellow
    $env:DB_HOST = "localhost"
    $env:DB_PORT = "5432"
    $env:DB_NAME = "research_system"
    $env:DB_USER = "research_user"
    $env:DB_PASSWORD = $DB_PASSWORD
    
    npm run db:migrate
    npm run db:seed
    
    Write-Host "`nStopping Cloud SQL Proxy..." -ForegroundColor Yellow
    Stop-Process -Id $proxyProcess.Id
    
    Write-Host "Migrations complete!" -ForegroundColor Green
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Database Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nYour USSD app should now work!" -ForegroundColor Green
Write-Host "Test it at: https://research-system-864580156744.us-central1.run.app/ussd/callback" -ForegroundColor White
