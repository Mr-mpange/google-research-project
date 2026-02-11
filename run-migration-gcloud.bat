@echo off
echo ========================================
echo Running SQL Migration on Cloud SQL
echo ========================================
echo.

REM Set variables
set INSTANCE=research-db
set DATABASE=research_system
set USER=postgres
set PASSWORD=ResearchDB2024!

echo Instance: %INSTANCE%
echo Database: %DATABASE%
echo User: %USER%
echo.

echo Connecting to Cloud SQL and running migration...
echo.

REM Run the SQL migration
gcloud sql connect %INSTANCE% --user=%USER% --database=%DATABASE% --quiet < migration.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Migration completed successfully!
    echo ========================================
    echo.
    echo Verifying changes...
    node check-schema-via-api.js
) else (
    echo.
    echo ========================================
    echo Migration failed!
    echo ========================================
    echo Error code: %ERRORLEVEL%
)

echo.
pause
