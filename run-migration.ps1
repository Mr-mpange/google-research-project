# PowerShell script to run SQL migration on Cloud SQL
Write-Host "`n=== Running SQL Migration on Cloud SQL ===" -ForegroundColor Cyan
Write-Host ""

# Set project
Write-Host "Setting project..." -ForegroundColor Yellow
gcloud config set project trans-campus-480505-i2

# Get Cloud SQL connection info
Write-Host "`nGetting Cloud SQL instance info..." -ForegroundColor Yellow
$instance = "research-db"
$database = "research_system"
$user = "postgres"

Write-Host "Instance: $instance" -ForegroundColor Green
Write-Host "Database: $database" -ForegroundColor Green
Write-Host "User: $user" -ForegroundColor Green
Write-Host ""

# Read SQL file
$sqlFile = "migration.sql"
if (-not (Test-Path $sqlFile)) {
    Write-Host "ERROR: $sqlFile not found!" -ForegroundColor Red
    exit 1
}

Write-Host "SQL file: $sqlFile" -ForegroundColor Green
Write-Host ""

# Execute SQL using gcloud
Write-Host "Executing SQL migration..." -ForegroundColor Yellow
Write-Host "This will prompt for the postgres password..." -ForegroundColor Yellow
Write-Host ""

# Use gcloud sql connect with input redirection
Get-Content $sqlFile | gcloud sql connect $instance --user=$user --database=$database --quiet

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Migration completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Verifying changes..." -ForegroundColor Yellow
    node check-schema-via-api.js
} else {
    Write-Host "`n❌ Migration failed!" -ForegroundColor Red
    Write-Host "Error code: $LASTEXITCODE" -ForegroundColor Red
}

Write-Host ""
