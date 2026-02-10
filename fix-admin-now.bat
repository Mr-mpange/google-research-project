@echo off
echo ============================================================
echo FIX ADMIN PASSWORD - GOOGLE CLOUD
echo ============================================================
echo.
echo This will open Google Cloud Shell in your browser.
echo.
echo COPY THIS COMMAND:
echo ============================================================
echo.
echo gcloud sql connect research-db --user=postgres --database=research_system
echo.
echo ============================================================
echo.
echo Then paste and run this SQL:
echo ============================================================
echo.
echo UPDATE users SET password_hash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILSBHxQYK', role = 'admin', is_active = true WHERE username = 'admin';
echo SELECT username, email, role FROM users WHERE username = 'admin';
echo \q
echo.
echo ============================================================
echo.
pause
echo.
echo Opening Google Cloud Console...
start https://console.cloud.google.com/cloudshell
echo.
echo After running the command, press any key to test the login...
pause
echo.
echo Testing login...
node verify-admin.js
pause
