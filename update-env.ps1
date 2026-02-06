# Script to update Cloud Run environment variables

Write-Host "Update Cloud Run Environment Variables" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Show current variables
Write-Host "Current environment variables:" -ForegroundColor Yellow
gcloud run services describe research-system --region us-central1 --format="table(spec.template.spec.containers[0].env)"

Write-Host "`nWhat would you like to do?" -ForegroundColor Cyan
Write-Host "1. Add/Update a single variable" -ForegroundColor White
Write-Host "2. Add/Update multiple variables" -ForegroundColor White
Write-Host "3. Remove a variable" -ForegroundColor White
Write-Host "4. Update secrets (API keys)" -ForegroundColor White
$choice = Read-Host "`nEnter choice (1-4)"

switch ($choice) {
    "1" {
        Write-Host "`nAdd/Update Single Variable" -ForegroundColor Yellow
        $varName = Read-Host "Variable name (e.g., DB_HOST, PORT)"
        $varValue = Read-Host "Variable value"
        
        Write-Host "`nUpdating..." -ForegroundColor Yellow
        gcloud run services update research-system `
            --region us-central1 `
            --update-env-vars="$varName=$varValue"
        
        Write-Host "`nVariable updated!" -ForegroundColor Green
    }
    
    "2" {
        Write-Host "`nAdd/Update Multiple Variables" -ForegroundColor Yellow
        Write-Host "Enter variables in format: VAR1=value1,VAR2=value2" -ForegroundColor Gray
        $vars = Read-Host "Variables"
        
        Write-Host "`nUpdating..." -ForegroundColor Yellow
        gcloud run services update research-system `
            --region us-central1 `
            --update-env-vars="$vars"
        
        Write-Host "`nVariables updated!" -ForegroundColor Green
    }
    
    "3" {
        Write-Host "`nRemove Variable" -ForegroundColor Yellow
        $varName = Read-Host "Variable name to remove"
        
        Write-Host "`nRemoving..." -ForegroundColor Yellow
        gcloud run services update research-system `
            --region us-central1 `
            --remove-env-vars="$varName"
        
        Write-Host "`nVariable removed!" -ForegroundColor Green
    }
    
    "4" {
        Write-Host "`nUpdate Secrets (API Keys)" -ForegroundColor Yellow
        Write-Host "Which secret do you want to update?" -ForegroundColor Cyan
        Write-Host "1. Gemini API Key" -ForegroundColor White
        Write-Host "2. Africa's Talking API Key" -ForegroundColor White
        Write-Host "3. Africa's Talking Username" -ForegroundColor White
        Write-Host "4. JWT Secret" -ForegroundColor White
        $secretChoice = Read-Host "`nEnter choice (1-4)"
        
        switch ($secretChoice) {
            "1" {
                $newValue = Read-Host "Enter new Gemini API Key"
                echo $newValue | gcloud secrets versions add gemini-api-key --data-file=-
                Write-Host "Gemini API Key updated!" -ForegroundColor Green
            }
            "2" {
                $newValue = Read-Host "Enter new Africa's Talking API Key"
                echo $newValue | gcloud secrets versions add at-api-key --data-file=-
                Write-Host "Africa's Talking API Key updated!" -ForegroundColor Green
            }
            "3" {
                $newValue = Read-Host "Enter new Africa's Talking Username"
                echo $newValue | gcloud secrets versions add at-username --data-file=-
                Write-Host "Africa's Talking Username updated!" -ForegroundColor Green
            }
            "4" {
                $newValue = Read-Host "Enter new JWT Secret (or press Enter to generate)"
                if ([string]::IsNullOrWhiteSpace($newValue)) {
                    $newValue = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
                    Write-Host "Generated new JWT secret" -ForegroundColor Yellow
                }
                echo $newValue | gcloud secrets versions add jwt-secret --data-file=-
                Write-Host "JWT Secret updated!" -ForegroundColor Green
            }
        }
        
        Write-Host "`nNote: Secrets are updated immediately. No need to redeploy." -ForegroundColor Cyan
    }
}

Write-Host "`nView updated configuration:" -ForegroundColor Cyan
Write-Host "gcloud run services describe research-system --region us-central1" -ForegroundColor Gray
