@echo off
echo ========================================
echo Running SQL Migration for Approval System
echo ========================================
echo.
echo Please follow these steps:
echo.
echo 1. Go to: https://console.cloud.google.com/sql/instances/research-db/overview?project=trans-campus-480505-i2
echo 2. Click "OPEN CLOUD SHELL" button at the top
echo 3. In Cloud Shell, run this command:
echo.
echo    gcloud sql connect research-db --user=postgres --database=research_system
echo.
echo 4. When prompted for password, enter your postgres password
echo 5. Copy and paste the SQL from: src\database\add-approval-system.sql
echo 6. Press Enter to execute
echo 7. Type \q to exit psql
echo.
echo ========================================
echo.
pause
